import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(this.configService.stripeSecretKey, {
      apiVersion: '2025-04-30.basil',
    });
  }

  /**
   * Create a Stripe customer
   */
  async createCustomer(customer: {
    name: string;
    email: string;
    phone?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    this.logger.log(`Creating Stripe customer for ${customer.email}`);

    return this.stripe.customers.create({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      metadata: customer.metadata,
    });
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.logger.log(
      `Attaching payment method ${paymentMethodId} to customer ${customerId}`,
    );

    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  /**
   * Get customer's payment methods
   */
  async getPaymentMethods(
    customerId: string,
    type: 'card' = 'card',
  ): Promise<Stripe.PaymentMethod[]> {
    this.logger.log(`Getting payment methods for customer ${customerId}`);

    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type,
    });

    return paymentMethods.data;
  }

  /**
   * Process a payment
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId?: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(
      `Creating payment intent for customer ${customerId} for amount ${amount} ${currency}`,
    );

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      customer: customerId,
      metadata,
      payment_method_types: ['card'],
      confirm: !!paymentMethodId,
    };

    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId;
    }

    return this.stripe.paymentIntents.create(paymentIntentParams);
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.logger.log(`Detaching payment method ${paymentMethodId}`);

    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Getting payment intent ${paymentIntentId}`);

    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
}
