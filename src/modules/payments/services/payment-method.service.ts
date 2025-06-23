import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PaymentMethodRepository } from '../repositories/payment-method.repository';
import { PaymentMethod } from '../schemas/payment-method.schema';
import { CustomersService } from '../../customers/customers.service';
import { StripeService } from './stripe.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class PaymentMethodService {
  constructor(
    private readonly paymentMethodRepository: PaymentMethodRepository,
    private readonly stripeService: StripeService,
    private readonly customersService: CustomersService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get all payment methods for a customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    this.logger.info(`Getting payment methods for customer ${customerId}`);
    return this.paymentMethodRepository.findByCustomerId(customerId);
  }

  /**
   * Get the default payment method for a customer
   */
  async getDefaultPaymentMethod(
    customerId: string,
  ): Promise<PaymentMethod | null> {
    this.logger.info(
      `Getting default payment method for customer ${customerId}`,
    );
    return this.paymentMethodRepository.findDefaultByCustomerId(customerId);
  }

  /**
   * Get a payment method by ID
   */
  async getPaymentMethodById(
    paymentMethodId: string,
  ): Promise<PaymentMethod | null> {
    this.logger.info(`Getting payment method by ID ${paymentMethodId}`);
    return this.paymentMethodRepository.findById(paymentMethodId);
  }

  /**
   * Set a payment method as default
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<PaymentMethod> {
    this.logger.info(
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
    this.logger.info(
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
      this.logger.info(
        `Successfully detached payment method ${paymentMethod.stripePaymentMethodId} from Stripe`,
      );
    } catch (error) {
      // Just log the error and continue - this could happen in test environments
      // or if the payment method was already detached
      this.logger.info(`Note: Could not detach from Stripe: ${error.message}`);
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

  /**
   * Create a Setup Intent for adding payment methods (Uber-style)
   */
  async createSetupIntent(
    customerId: string,
    metadata?: Record<string, string>,
  ): Promise<{ client_secret: string; setup_intent_id: string }> {
    this.logger.info(`Creating setup intent for customer ${customerId}`);

    // Get customer's Stripe customer ID
    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
    ]);

    if (!customer?.stripeCustomerId) {
      throw new BadRequestException('Customer does not have a Stripe account');
    }

    // Create Setup Intent
    const setupIntent = await this.stripeService.createSetupIntent(
      customer.stripeCustomerId,
      {
        customer_id: customerId,
        ...metadata,
      },
    );

    if (!setupIntent.client_secret) {
      throw new BadRequestException('Failed to create setup intent');
    }

    return {
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
    };
  }

  /**
   * Save payment method after Setup Intent confirmation
   */
  async savePaymentMethodFromSetupIntent(
    customerId: string,
    setupIntentId: string,
    paymentMethodId: string,
    name?: string,
  ): Promise<PaymentMethod> {
    this.logger.info(
      `Saving payment method from setup intent ${setupIntentId} for customer ${customerId}`,
    );

    // Get customer's Stripe customer ID
    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
    ]);

    if (!customer?.stripeCustomerId) {
      throw new BadRequestException('Customer does not have a Stripe account');
    }

    // Validate Setup Intent
    const setupIntent =
      await this.stripeService.retrieveSetupIntent(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      throw new BadRequestException('Setup intent not succeeded');
    }

    if (setupIntent.customer !== customer.stripeCustomerId) {
      throw new ForbiddenException('Invalid setup intent for this customer');
    }

    if (setupIntent.payment_method !== paymentMethodId) {
      throw new BadRequestException(
        'Payment method ID does not match setup intent',
      );
    }

    // Get payment method details from Stripe
    const stripePaymentMethod =
      await this.stripeService.getPaymentMethod(paymentMethodId);

    // Check if this payment method already exists
    const existingPaymentMethod =
      await this.paymentMethodRepository.findByStripePaymentMethodId(
        paymentMethodId,
      );

    if (existingPaymentMethod) {
      this.logger.info(
        'Payment method already exists, returning existing record',
      );
      return existingPaymentMethod;
    }

    // Attach payment method to customer (if not already attached)
    if (!stripePaymentMethod.customer) {
      await this.stripeService.attachPaymentMethod(
        paymentMethodId,
        customer.stripeCustomerId,
      );
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
      stripePaymentMethodId: paymentMethodId,
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

    this.logger.info(
      `Successfully saved payment method ${paymentMethodId} for customer ${customerId}`,
    );

    return paymentMethod;
  }

  async saveFakePaymentMethodFromSetupIntent(
    customerId: string,
    paymentMethodId: string,
    name?: string,
  ): Promise<PaymentMethod> {
    this.logger.info(`Saving payment method from  for customer ${customerId}`);

    // Get customer's Stripe customer ID
    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
    ]);

    if (!customer?.stripeCustomerId) {
      throw new BadRequestException('Customer does not have a Stripe account');
    }

    // Get payment method details from Stripe
    const stripePaymentMethod =
      await this.stripeService.getPaymentMethod(paymentMethodId);

    // Check if this payment method already exists
    const existingPaymentMethod =
      await this.paymentMethodRepository.findByStripePaymentMethodId(
        paymentMethodId,
      );

    if (existingPaymentMethod) {
      this.logger.info(
        'Payment method already exists, returning existing record',
      );
      return existingPaymentMethod;
    }

    // Attach payment method to customer (if not already attached)
    if (!stripePaymentMethod.customer) {
      await this.stripeService.attachPaymentMethod(
        paymentMethodId,
        customer.stripeCustomerId,
      );
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
      stripePaymentMethodId: paymentMethodId,
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

    this.logger.info(
      `Successfully saved payment method ${paymentMethodId} for customer ${customerId}`,
    );

    return paymentMethod;
  }
}
