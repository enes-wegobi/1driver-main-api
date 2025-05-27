import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CustomersService } from '../customers/customers.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { Payment } from './schemas/payment.schema';
import { WebhookHandlerService } from './webhook-handler.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly customersService: CustomersService,
    private readonly paymentRepository: PaymentRepository,
    private readonly webhookHandlerService: WebhookHandlerService,
  ) {}

  /**
   * Create a Stripe customer when a customer is created in the system
   */
  async createStripeCustomer(
    customerId: string,
    customerData: {
      name: string;
      email: string;
      phone?: string;
    },
  ): Promise<any> {
    this.logger.log(`Creating Stripe customer for user ${customerId}`);

    const stripeCustomer = await this.stripeService.createCustomer({
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone,
      metadata: { customerId },
    });

    // Update the customer record with the Stripe customer ID
    await this.customersService.updateStripeCustomerId(
      customerId,
      stripeCustomer.id,
    );

    return stripeCustomer;
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
    setAsDefault: boolean = true,
  ): Promise<any> {
    this.logger.log(
      `Adding payment method ${paymentMethodId} for customer ${customerId}`,
    );

    // Get the Stripe customer ID from the customer record
    const customer = await this.customersService.findOne(
      customerId,
      'stripeCustomerId',
    );

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    const paymentMethod = await this.stripeService.addPaymentMethod(
      customer.stripeCustomerId,
      paymentMethodId,
    );

    // If this is the first payment method or setAsDefault is true, set it as default
    if (setAsDefault) {
      await this.setDefaultPaymentMethod(customerId, paymentMethodId);
    }

    return paymentMethod;
  }

  /**
   * Set a payment method as default for a customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<any> {
    this.logger.log(
      `Setting payment method ${paymentMethodId} as default for customer ${customerId}`,
    );

    // Verify the customer owns this payment method
    const paymentMethods = await this.getPaymentMethods(customerId);
    const paymentMethodExists = paymentMethods.some(
      (pm) => pm.id === paymentMethodId,
    );

    if (!paymentMethodExists) {
      throw new Error(
        'Payment method not found or does not belong to this customer',
      );
    }

    // Get the Stripe customer ID from the customer record
    const customer = await this.customersService.findOne(
      customerId,
      'stripeCustomerId',
    );

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    // Update Stripe's default payment method
    await this.stripeService.setDefaultPaymentMethod(
      customer.stripeCustomerId,
      paymentMethodId,
    );

    // Update our database record of the default payment method
    await this.customersService.updateDefaultPaymentMethod(
      customerId,
      paymentMethodId,
    );

    return { success: true, defaultPaymentMethodId: paymentMethodId };
  }

  /**
   * Get the default payment method for a customer
   */
  async getDefaultPaymentMethod(customerId: string): Promise<any> {
    this.logger.log(
      `Getting default payment method for customer ${customerId}`,
    );

    // Get the customer with the default payment method ID
    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
      'defaultPaymentMethodId',
    ]);

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    if (!customer.defaultPaymentMethodId) {
      return null; // No default payment method set
    }

    // Get the payment method details from Stripe
    try {
      const paymentMethod = await this.stripeService.getPaymentMethod(
        customer.defaultPaymentMethodId,
      );
      return paymentMethod;
    } catch (error) {
      this.logger.error(
        `Error retrieving default payment method: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get a customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<any> {
    this.logger.log(`Getting payment methods for customer ${customerId}`);

    const customer = await this.customersService.findOne(
      customerId,
      'stripeCustomerId',
    );

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    return this.stripeService.getPaymentMethods(customer.stripeCustomerId);
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<any> {
    this.logger.log(
      `Deleting payment method ${paymentMethodId} for customer ${customerId}`,
    );

    // Verify the customer owns this payment method
    const paymentMethods = await this.getPaymentMethods(customerId);
    const paymentMethodExists = paymentMethods.some(
      (pm) => pm.id === paymentMethodId,
    );

    if (!paymentMethodExists) {
      throw new Error(
        'Payment method not found or does not belong to this customer',
      );
    }

    return this.stripeService.deletePaymentMethod(paymentMethodId);
  }

  /**
   * Process a payment
   */
  async processPayment(
    customerId: string,
    amount: number,
    currency: string = 'usd',
    paymentMethodId?: string,
    metadata?: Record<string, string>,
  ): Promise<any> {
    this.logger.log(
      `Processing payment of ${amount} ${currency} for customer ${customerId}`,
    );

    // Get the customer with stripe ID and default payment method ID
    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
      'defaultPaymentMethodId',
    ]);

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    // If no payment method is specified, use the default one
    let methodToUse = paymentMethodId;
    if (!methodToUse && customer.defaultPaymentMethodId) {
      this.logger.log(
        `Using default payment method ${customer.defaultPaymentMethodId}`,
      );
      methodToUse = customer.defaultPaymentMethodId;
    }

    return this.stripeService.createPaymentIntent(
      amount,
      currency,
      customer.stripeCustomerId,
      methodToUse,
      metadata,
    );
  }

  /**
   * Get payment intent details
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    this.logger.log(`Getting payment intent ${paymentIntentId}`);

    return this.stripeService.getPaymentIntent(paymentIntentId);
  }

  /**
   * Create a payment record in the database
   */
  async createPaymentRecord(
    customerId: string,
    amount: number,
    currency: string = 'usd',
    paymentMethodId: string,
    tripId?: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`Creating payment record for customer ${customerId}`);

    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
    ]);

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount * 100,
      currency,
      customer.stripeCustomerId,
      paymentMethodId,
      metadata,
    );

    const payment = await this.paymentRepository.create({
      customerId,
      tripId,
      amount,
      currency,
      paymentMethodId,
      stripePaymentIntentId: paymentIntent.id,
      status: PaymentStatus.PENDING,
      metadata,
    });

    return {
      payment,
      clientSecret: paymentIntent.client_secret,
    };
  }

  /**
   * Create off-session payment for trip (Uber-style)
   */
  async createTripPayment(
    customerId: string,
    amount: number,
    currency: string = 'try',
    stripePaymentMethodId: string,
    tripId: string,
    metadata?: Record<string, any>,
  ): Promise<{
    payment: Payment;
    requiresAction: boolean;
    clientSecret?: string;
    paymentIntentId: string;
  }> {
    this.logger.log(
      `Creating off-session trip payment for customer ${customerId}, trip ${tripId}, amount ${amount} ${currency}`,
    );

    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
    ]);

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    try {
      // Create off-session Payment Intent
      const paymentIntent = await this.stripeService.createOffSessionPaymentIntent(
        Math.round(amount * 100), // Convert to cents
        currency,
        customer.stripeCustomerId,
        stripePaymentMethodId,
        {
          trip_id: tripId,
          customer_id: customerId,
          ...metadata,
        },
      );

      // Create payment record
      const payment = await this.paymentRepository.create({
        customerId,
        tripId,
        amount,
        currency,
        paymentMethodId: stripePaymentMethodId,
        stripePaymentIntentId: paymentIntent.id,
        status: this.getPaymentStatusFromStripe(paymentIntent.status),
        metadata,
      });

      // Check if 3D Secure is required
      const requiresAction = paymentIntent.status === 'requires_action';

      return {
        payment,
        requiresAction,
        clientSecret: requiresAction ? (paymentIntent.client_secret || undefined) : undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error(
        `Error creating trip payment: ${error.message}`,
        error.stack,
      );

      // Create failed payment record
      const payment = await this.paymentRepository.create({
        customerId,
        tripId,
        amount,
        currency,
        paymentMethodId: stripePaymentMethodId,
        status: PaymentStatus.FAILED,
        errorMessage: error.message,
        metadata,
      });

      throw error;
    }
  }

  /**
   * Convert Stripe payment intent status to our PaymentStatus enum
   */
  private getPaymentStatusFromStripe(stripeStatus: string): PaymentStatus {
    switch (stripeStatus) {
      case 'succeeded':
        return PaymentStatus.PAID;
      case 'processing':
        return PaymentStatus.PROCESSING;
      case 'requires_action':
        return PaymentStatus.PENDING;
      case 'canceled':
        return PaymentStatus.CANCELLED;
      case 'requires_payment_method':
      case 'requires_confirmation':
        return PaymentStatus.PENDING;
      default:
        return PaymentStatus.FAILED;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(signature: string, payload: Buffer): Promise<any> {
    this.logger.log('Handling Stripe webhook event');

    try {
      const event = await this.stripeService.handleWebhookEvent(
        signature,
        payload,
      );

      // Process the event based on type using WebhookHandlerService
      switch (event.type) {
        case 'payment_intent.succeeded':
          return this.webhookHandlerService.handlePaymentSuccess(event.data.object);
        case 'payment_intent.payment_failed':
          return this.webhookHandlerService.handlePaymentFailure(event.data.object);
        case 'payment_intent.canceled':
          return this.webhookHandlerService.handlePaymentCancellation(event.data.object);
        case 'payment_intent.requires_action':
          return this.webhookHandlerService.handlePaymentRequiresAction(event.data.object);
        case 'payment_intent.processing':
          return this.webhookHandlerService.handlePaymentProcessing(event.data.object);
        case 'setup_intent.succeeded':
          return this.webhookHandlerService.handleSetupIntentSuccess(event.data.object);
        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
          return { received: true, type: event.type };
      }
    } catch (error) {
      this.logger.error(
        `Error handling webhook: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get customer's payment history
   */
  async getPaymentHistory(customerId: string): Promise<Payment[]> {
    this.logger.log(`Getting payment history for customer ${customerId}`);
    return this.paymentRepository.findByCustomerId(customerId);
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    this.logger.log(`Getting payment details for ${paymentId}`);
    return this.paymentRepository.findById(paymentId);
  }
}
