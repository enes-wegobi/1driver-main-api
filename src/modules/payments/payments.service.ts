import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CustomersService } from '../customers/customers.service';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { Payment } from './schemas/payment.schema';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly customersService: CustomersService,
    private readonly paymentRepository: PaymentRepository,
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
    this.logger.log(`Getting default payment method for customer ${customerId}`);

    // Get the customer with the default payment method ID
    const customer = await this.customersService.findOne(
      customerId,
      ['stripeCustomerId', 'defaultPaymentMethodId'],
    );

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
    const customer = await this.customersService.findOne(
      customerId,
      ['stripeCustomerId', 'defaultPaymentMethodId'],
    );

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    // If no payment method is specified, use the default one
    let methodToUse = paymentMethodId;
    if (!methodToUse && customer.defaultPaymentMethodId) {
      this.logger.log(`Using default payment method ${customer.defaultPaymentMethodId}`);
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
    paymentMethodId?: string,
    tripId?: string,
    metadata?: Record<string, any>,
  ): Promise<any> {
    this.logger.log(`Creating payment record for customer ${customerId}`);

    // Get the customer with stripe ID and default payment method ID
    const customer = await this.customersService.findOne(
      customerId,
      ['stripeCustomerId', 'defaultPaymentMethodId'],
    );

    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }

    // If no payment method is specified, use the default one
    let methodToUse = paymentMethodId;
    if (!methodToUse && customer.defaultPaymentMethodId) {
      this.logger.log(`Using default payment method ${customer.defaultPaymentMethodId}`);
      methodToUse = customer.defaultPaymentMethodId;
    }

    // Create payment intent in Stripe
    const paymentIntent = await this.stripeService.createPaymentIntent(
      amount,
      currency,
      customer.stripeCustomerId,
      methodToUse,
      metadata,
    );

    // Create payment record in database
    const payment = await this.paymentRepository.create({
      customerId,
      tripId,
      amount,
      currency,
      paymentMethodId: methodToUse, // Use the selected payment method
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
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(signature: string, payload: Buffer): Promise<any> {
    this.logger.log('Handling Stripe webhook event');

    try {
      const event = await this.stripeService.handleWebhookEvent(signature, payload);

      // Process the event based on type
      switch (event.type) {
        case 'payment_intent.succeeded':
          return this.handlePaymentSuccess(event.data.object);
        case 'payment_intent.payment_failed':
          return this.handlePaymentFailure(event.data.object);
        case 'payment_intent.canceled':
          return this.handlePaymentCancellation(event.data.object);
        // Add other cases as needed
      }

      return event;
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSuccess(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment succeeded for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(paymentIntent.id);
    if (!payment) {
      this.logger.warn(`No payment record found for intent ${paymentIntent.id}`);
      return null;
    }

    // Update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PAID,
    );

    // If this payment is for a trip, update the trip payment status
    if (updatedPayment && updatedPayment.tripId) {
      // TODO: Update trip payment status
      // await this.tripService.updatePaymentStatus(updatedPayment.tripId, PaymentStatus.PAID);
      this.logger.log(`Updated trip ${updatedPayment.tripId} payment status to PAID`);
    }

    return updatedPayment;
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment failed for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(paymentIntent.id);
    if (!payment) {
      this.logger.warn(`No payment record found for intent ${paymentIntent.id}`);
      return null;
    }

    // Get error message
    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

    // Update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.FAILED,
      errorMessage,
    );

    // If this payment is for a trip, update the trip payment status
    if (updatedPayment && updatedPayment.tripId) {
      // TODO: Update trip payment status
      // await this.tripService.updatePaymentStatus(updatedPayment.tripId, PaymentStatus.FAILED);
      this.logger.log(`Updated trip ${updatedPayment.tripId} payment status to FAILED`);
    }

    return updatedPayment;
  }

  /**
   * Handle cancelled payment
   */
  private async handlePaymentCancellation(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment cancelled for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(paymentIntent.id);
    if (!payment) {
      this.logger.warn(`No payment record found for intent ${paymentIntent.id}`);
      return null;
    }

    // Update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.CANCELLED,
    );

    // If this payment is for a trip, update the trip payment status
    if (updatedPayment && updatedPayment.tripId) {
      // TODO: Update trip payment status
      // await this.tripService.updatePaymentStatus(updatedPayment.tripId, PaymentStatus.CANCELLED);
      this.logger.log(`Updated trip ${updatedPayment.tripId} payment status to CANCELLED`);
    }

    return updatedPayment;
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
