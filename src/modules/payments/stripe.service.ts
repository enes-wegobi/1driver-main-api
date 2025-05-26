import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    this.stripe = new Stripe(this.configService.stripeSecretKey, {
      apiVersion: this.configService.stripeApiVersion as any,
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
    await this.setDefaultPaymentMethod(customerId, paymentMethodId);

    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  /**
   * Set a payment method as the default for a customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    this.logger.log(
      `Setting payment method ${paymentMethodId} as default for customer ${customerId}`,
    );

    return this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
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
   * Get a specific payment method
   */
  async getPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.logger.log(`Getting payment method ${paymentMethodId}`);

    return this.stripe.paymentMethods.retrieve(paymentMethodId);
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

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(
    signature: string,
    payload: Buffer,
  ): Promise<Stripe.Event> {
    this.logger.log('Processing Stripe webhook event');

    try {
      this.logger.debug(`Payload type: ${typeof payload}, isBuffer: ${Buffer.isBuffer(payload)}, length: ${payload.length}`);
      this.logger.debug(`Signature: ${signature}`);
      this.logger.debug(`Webhook secret configured: ${!!this.configService.stripeWebhookSecret}`);

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.stripeWebhookSecret,
      );

      this.logger.log(`Webhook event type: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      this.logger.error(`Payload preview: ${payload.toString().substring(0, 100)}...`);
      throw error;
    }
  }

  /**
   * Update a payment intent
   */
  async updatePaymentIntent(
    paymentIntentId: string,
    updateData: Stripe.PaymentIntentUpdateParams,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Updating payment intent ${paymentIntentId}`);

    return this.stripe.paymentIntents.update(paymentIntentId, updateData);
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Confirming payment intent ${paymentIntentId}`);

    const confirmParams: Stripe.PaymentIntentConfirmParams = {};

    if (paymentMethodId) {
      confirmParams.payment_method = paymentMethodId;
    }

    return this.stripe.paymentIntents.confirm(paymentIntentId, confirmParams);
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(
    paymentIntentId: string,
    cancellationReason?: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.log(`Cancelling payment intent ${paymentIntentId}`);

    return this.stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: cancellationReason as any,
    });
  }
}
