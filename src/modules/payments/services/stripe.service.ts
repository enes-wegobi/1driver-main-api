import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { LoggerService } from 'src/logger/logger.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
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
    this.logger.info(`Creating Stripe customer for ${customer.email}`);

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
    this.logger.info(
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
    this.logger.info(
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
    this.logger.info(`Getting payment method ${paymentMethodId}`);

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
    this.logger.info(
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
    this.logger.info(`Detaching payment method ${paymentMethodId}`);

    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.info(`Getting payment intent ${paymentIntentId}`);

    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(
    signature: string,
    payload: Buffer,
  ): Promise<Stripe.Event> {
    this.logger.info('Processing Stripe webhook event');

    try {
      this.logger.debug(
        `Payload type: ${typeof payload}, isBuffer: ${Buffer.isBuffer(payload)}, length: ${payload.length}`,
      );
      this.logger.debug(`Signature: ${signature}`);
      this.logger.debug(
        `Webhook secret configured: ${!!this.configService.stripeWebhookSecret}`,
      );

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.stripeWebhookSecret,
      );

      this.logger.info(`Webhook event type: ${event.type}`);
      return event;
    } catch (error) {
      this.logger.error(`Webhook error: ${error.message}`, error.stack);
      this.logger.error(
        `Payload preview: ${payload.toString().substring(0, 100)}...`,
      );
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
    this.logger.info(`Updating payment intent ${paymentIntentId}`);

    return this.stripe.paymentIntents.update(paymentIntentId, updateData);
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.info(`Confirming payment intent ${paymentIntentId}`);

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
    this.logger.info(`Cancelling payment intent ${paymentIntentId}`);

    return this.stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: cancellationReason as any,
    });
  }

  /**
   * Create a Setup Intent for future payments (Uber-style card addition)
   */
  async createSetupIntent(
    customerId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.SetupIntent> {
    this.logger.info(`Creating setup intent for customer ${customerId}`);

    return this.stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata,
    });
  }

  /**
   * Retrieve a Setup Intent
   */
  async retrieveSetupIntent(
    setupIntentId: string,
  ): Promise<Stripe.SetupIntent> {
    this.logger.info(`Retrieving setup intent ${setupIntentId}`);

    return this.stripe.setupIntents.retrieve(setupIntentId);
  }

  /**
   * Create off-session Payment Intent for trip payments
   */
  async createOffSessionPaymentIntent(
    amount: number,
    currency: string,
    customerId: string,
    paymentMethodId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.PaymentIntent> {
    this.logger.info(
      `Creating off-session payment intent for customer ${customerId} with amount ${amount} ${currency}`,
    );
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      payment_method: paymentMethodId,
      confirmation_method: 'manual',
      confirm: true,
      off_session: true, // This enables saved card payments
      metadata,
    });

    return paymentIntent;
  }

  /**
   * Attach payment method to customer (without setting as default)
   */
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    this.logger.info(
      `Attaching payment method ${paymentMethodId} to customer ${customerId}`,
    );

    return this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }
}
