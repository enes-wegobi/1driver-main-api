import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * Create a Stripe customer when a customer is created in the system
   */
  async createStripeCustomer(customerId: string, customerData: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<any> {
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
      stripeCustomer.id
    );
    
    return stripeCustomer;
  }

  /**
   * Add a payment method to a customer
   */
  async addPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<any> {
    this.logger.log(`Adding payment method ${paymentMethodId} for customer ${customerId}`);
    
    // Get the Stripe customer ID from the customer record
    const customer = await this.customersService.findOne(customerId, 'stripeCustomerId');
    
    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }
    
    const paymentMethod = await this.stripeService.addPaymentMethod(
      customer.stripeCustomerId,
      paymentMethodId,
    );
    
    return paymentMethod;
  }

  /**
   * Get a customer's payment methods
   */
  async getPaymentMethods(customerId: string): Promise<any> {
    this.logger.log(`Getting payment methods for customer ${customerId}`);
    
    const customer = await this.customersService.findOne(customerId, 'stripeCustomerId');
    
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
    this.logger.log(`Deleting payment method ${paymentMethodId} for customer ${customerId}`);
    
    // Verify the customer owns this payment method
    const paymentMethods = await this.getPaymentMethods(customerId);
    const paymentMethodExists = paymentMethods.some(pm => pm.id === paymentMethodId);
    
    if (!paymentMethodExists) {
      throw new Error('Payment method not found or does not belong to this customer');
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
    this.logger.log(`Processing payment of ${amount} ${currency} for customer ${customerId}`);
    
    const customer = await this.customersService.findOne(customerId, 'stripeCustomerId');
    
    if (!customer.stripeCustomerId) {
      throw new Error('Customer does not have a Stripe account');
    }
    
    return this.stripeService.createPaymentIntent(
      amount,
      currency,
      customer.stripeCustomerId,
      paymentMethodId,
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
}
