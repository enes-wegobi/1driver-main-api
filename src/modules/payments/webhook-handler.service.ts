import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { TripPaymentService } from '../trip/services/trip-payment.service';

@Injectable()
export class WebhookHandlerService {
  private readonly logger = new Logger(WebhookHandlerService.name);

  constructor(
    private readonly paymentRepository: PaymentRepository,
    @Inject(forwardRef(() => TripPaymentService))
    private readonly tripPaymentService: TripPaymentService,
  ) {}

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment succeeded for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );
    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id}`,
      );
      return null;
    }

    // Update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PAID,
    );

    // If this payment is for a trip, handle trip payment success
    if (updatedPayment && updatedPayment.tripId) {
      await this.tripPaymentService.handlePaymentSuccess(updatedPayment);
      this.logger.log(
        `Handled trip payment success for trip ${updatedPayment.tripId}`,
      );
    }

    return updatedPayment;
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailure(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment failed for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );
    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id}`,
      );
      return null;
    }

    // Get error message
    const errorMessage =
      paymentIntent.last_payment_error?.message || 'Payment failed';

    // Update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.FAILED,
      errorMessage,
    );

    // If this payment is for a trip, handle trip payment failure
    if (updatedPayment && updatedPayment.tripId) {
      await this.tripPaymentService.handlePaymentFailure(updatedPayment);
      this.logger.log(
        `Handled trip payment failure for trip ${updatedPayment.tripId}`,
      );
    }

    return updatedPayment;
  }

  /**
   * Handle cancelled payment webhook
   */
  async handlePaymentCancellation(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment cancelled for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );
    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id}`,
      );
      return null;
    }

    // Update payment status
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.CANCELLED,
    );

    // For trip payments, cancellation is handled similar to failure
    if (updatedPayment && updatedPayment.tripId) {
      await this.tripPaymentService.handlePaymentFailure(updatedPayment);
      this.logger.log(
        `Handled trip payment cancellation for trip ${updatedPayment.tripId}`,
      );
    }

    return updatedPayment;
  }

  /**
   * Handle Setup Intent succeeded webhook (for payment method addition)
   */
  async handleSetupIntentSuccess(setupIntent: any): Promise<any> {
    this.logger.log(`Setup Intent succeeded for ${setupIntent.id}`);

    // Setup Intent success is handled on the frontend when saving payment method
    // This webhook is mainly for logging and monitoring
    return {
      success: true,
      setupIntentId: setupIntent.id,
      paymentMethodId: setupIntent.payment_method,
    };
  }

  /**
   * Handle Payment Intent requires action (3D Secure)
   */
  async handlePaymentRequiresAction(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment requires action for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );
    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id}`,
      );
      return null;
    }

    // Update payment status to pending (waiting for 3D Secure)
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PENDING,
      'Waiting for 3D Secure authentication',
    );

    this.logger.log(
      `Payment ${payment._id} updated to pending status for 3D Secure`,
    );

    return updatedPayment;
  }

  /**
   * Handle Payment Intent processing
   */
  async handlePaymentProcessing(paymentIntent: any): Promise<any> {
    this.logger.log(`Payment processing for intent ${paymentIntent.id}`);

    const payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );
    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id}`,
      );
      return null;
    }

    // Update payment status to processing
    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PROCESSING,
    );

    this.logger.log(`Payment ${payment._id} updated to processing status`);

    return updatedPayment;
  }
}
