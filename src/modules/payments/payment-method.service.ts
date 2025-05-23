import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { StripeService } from './stripe.service';
import { PaymentMethod } from './schemas/payment-method.schema';

@Injectable()
export class PaymentMethodService {
  private readonly logger = new Logger(PaymentMethodService.name);

  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Add a payment method for a customer
   */
  async addPaymentMethod(
    customerId: string,
    stripePaymentMethodId: string,
    name?: string,
  ): Promise<PaymentMethod> {
    this.logger.log(
      `Adding payment method ${stripePaymentMethodId} for customer ${customerId}`,
    );

    // Get payment method details from Stripe
    const stripePaymentMethod = await this.stripeService.getPaymentMethod(
      stripePaymentMethodId,
    );

    // Check if this payment method already exists
    const existingPaymentMethod =
      await this.paymentMethodRepository.findByStripePaymentMethodId(
        stripePaymentMethodId,
      );

    if (existingPaymentMethod) {
      this.logger.log(
        'Payment method already exists, returning existing record',
      );
      return existingPaymentMethod;
    }

    // Check if this is the first payment method for the customer
    const existingMethods =
      await this.paymentMethodRepository.findByCustomerId(customerId);
    const isFirstPaymentMethod = existingMethods.length === 0;

    // If this is not the first payment method, unset the previous default
    if (!isFirstPaymentMethod) {
      await this.paymentMethodRepository.unsetDefault(customerId);
    }

    // Create payment method record
    const paymentMethod = await this.paymentMethodRepository.create({
      customerId,
      stripePaymentMethodId,
      name:
        name ||
        `${stripePaymentMethod.card?.brand} ending in ${stripePaymentMethod.card?.last4}`,
      brand: stripePaymentMethod.card?.brand,
      last4: stripePaymentMethod.card?.last4,
      expiryMonth: stripePaymentMethod.card?.exp_month,
      expiryYear: stripePaymentMethod.card?.exp_year,
      isDefault: true, // Always set as default (newest one is default)
      isActive: true,
    });

    return paymentMethod;
  }

  /**
   * Get all payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    this.logger.log(`Getting payment methods for customer ${customerId}`);
    return this.paymentMethodRepository.findByCustomerId(customerId);
  }

  /**
   * Get the default payment method for a customer
   */
  async getDefaultPaymentMethod(
    customerId: string,
  ): Promise<PaymentMethod | null> {
    this.logger.log(
      `Getting default payment method for customer ${customerId}`,
    );
    return this.paymentMethodRepository.findDefaultByCustomerId(customerId);
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethod> {
    this.logger.log(
      `Setting payment method ${paymentMethodId} as default for customer ${customerId}`,
    );

    // Verify the payment method exists and belongs to the customer
    const paymentMethod =
      await this.paymentMethodRepository.findById(paymentMethodId);
    if (
      !paymentMethod ||
      paymentMethod.customerId !== customerId ||
      !paymentMethod.isActive
    ) {
      throw new NotFoundException(
        'Payment method not found or does not belong to this customer',
      );
    }

    // Unset any existing default payment methods
    await this.paymentMethodRepository.unsetDefault(customerId);

    // Set the new default
    const updatedPaymentMethod =
      await this.paymentMethodRepository.setAsDefault(paymentMethodId);
    if (!updatedPaymentMethod) {
      throw new NotFoundException('Failed to set payment method as default');
    }

    return updatedPaymentMethod;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Deleting payment method ${paymentMethodId} for customer ${customerId}`,
    );

    // Verify the payment method exists and belongs to the customer
    const paymentMethod =
      await this.paymentMethodRepository.findById(paymentMethodId);
    if (
      !paymentMethod ||
      paymentMethod.customerId !== customerId ||
      !paymentMethod.isActive
    ) {
      throw new NotFoundException(
        'Payment method not found or does not belong to this customer',
      );
    }

    // Detach the payment method from Stripe
    try {
      await this.stripeService.deletePaymentMethod(
        paymentMethod.stripePaymentMethodId,
      );
      this.logger.log(
        `Successfully detached payment method ${paymentMethod.stripePaymentMethodId} from Stripe`,
      );
    } catch (error) {
      // Just log the error and continue - this could happen in test environments
      // or if the payment method was already detached
      this.logger.log(`Note: Could not detach from Stripe: ${error.message}`);
      // Continue with local deletion even if Stripe deletion fails
    }

    // Set the payment method as inactive
    await this.paymentMethodRepository.setInactive(paymentMethodId);

    // If this was the default payment method, set another one as default
    if (paymentMethod.isDefault) {
      const anotherPaymentMethod =
        await this.paymentMethodRepository.findAnyActiveByCustomerId(
          customerId,
        );
      if (anotherPaymentMethod) {
        await this.paymentMethodRepository.setAsDefault(
          String(anotherPaymentMethod._id),
        );
      }
    }

    return { success: true };
  }
}
