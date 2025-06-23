import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CustomersService } from '../../customers/customers.service';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { Payment } from '../schemas/payment.schema';
import { WebhookHandlerService } from './webhook-handler.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly customersService: CustomersService,
    private readonly paymentRepository: PaymentRepository,
    private readonly webhookHandlerService: WebhookHandlerService,
    private readonly logger: LoggerService,
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
    this.logger.info(`Creating Stripe customer for user ${customerId}`);

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
   * Process a payment
   */
  async processPayment(
    customerId: string,
    amount: number,
    currency: string = 'usd',
    paymentMethodId?: string,
    metadata?: Record<string, string>,
  ): Promise<any> {
    this.logger.info(
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
      this.logger.info(
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
    this.logger.info(`Getting payment intent ${paymentIntentId}`);

    return this.stripeService.getPaymentIntent(paymentIntentId);
  }

  /**
   * Create off-session payment for trip
   */
  async createTripPayment(
    customerId: string,
    amount: number,
    currency: string = 'try',
    stripePaymentMethodId: string,
    paymentMethodId: string,
    tripId: string,
    metadata?: Record<string, any>,
  ): Promise<{
    payment: Payment;
    requiresAction: boolean;
    clientSecret?: string;
    paymentIntentId: string;
  }> {
    this.logger.info(
      `Creating off-session trip payment for customer ${customerId}, trip ${tripId}, amount ${amount} ${currency}`,
    );

    const customer = await this.customersService.findOne(customerId, [
      'stripeCustomerId',
    ]);

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    let paymentIntent: any = null;

    try {
      // Create off-session Payment Intent
      paymentIntent = await this.stripeService.createOffSessionPaymentIntent(
        Math.round(amount * 100),
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
        paymentMethodId,
        stripePaymentIntentId: paymentIntent.id,
        status: this.getPaymentStatusFromStripe(paymentIntent.status),
        metadata,
      });

      // Check if 3D Secure is required
      const requiresAction = paymentIntent.status === 'requires_action';

      return {
        payment,
        requiresAction,
        clientSecret: requiresAction
          ? paymentIntent.client_secret || undefined
          : undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      this.logger.error(
        `Error creating trip payment: ${error.message}`,
        error.stack,
      );

      await this.paymentRepository.create({
        customerId,
        tripId,
        amount,
        currency,
        paymentMethodId,
        stripePaymentIntentId: paymentIntent?.id || null, // PaymentIntent ID'yi kaydet (varsa)
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
    this.logger.info('Handling Stripe webhook event');

    try {
      const event = await this.stripeService.handleWebhookEvent(
        signature,
        payload,
      );

      // Process the event based on type using WebhookHandlerService
      switch (event.type) {
        case 'payment_intent.succeeded':
          return this.webhookHandlerService.handlePaymentSuccess(
            event.data.object,
          );
        case 'payment_intent.payment_failed':
          return this.webhookHandlerService.handlePaymentFailure(
            event.data.object,
          );
        case 'payment_intent.canceled':
          return this.webhookHandlerService.handlePaymentCancellation(
            event.data.object,
          );
        case 'payment_intent.requires_action':
          return this.webhookHandlerService.handlePaymentRequiresAction(
            event.data.object,
          );
        case 'payment_intent.processing':
          return this.webhookHandlerService.handlePaymentProcessing(
            event.data.object,
          );
        case 'setup_intent.succeeded':
          return this.webhookHandlerService.handleSetupIntentSuccess(
            event.data.object,
          );
        default:
          this.logger.info(`Unhandled webhook event type: ${event.type}`);
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
    this.logger.info(`Getting payment history for customer ${customerId}`);
    return this.paymentRepository.findByCustomerId(customerId);
  }

  /**
   * Get payment details by ID
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    this.logger.info(`Getting payment details for ${paymentId}`);
    return this.paymentRepository.findById(paymentId);
  }
}
