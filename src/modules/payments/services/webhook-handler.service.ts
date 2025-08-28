import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { TripPaymentService } from '../../trip/services/trip-payment.service';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class WebhookHandlerService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    @Inject(forwardRef(() => TripPaymentService))
    private readonly tripPaymentService: TripPaymentService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(paymentIntent: any): Promise<any> {
    this.logger.info(`Payment succeeded for intent ${paymentIntent.id}`);

    let payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );

    if (!payment && paymentIntent.metadata?.payment_record_id) {
      this.logger.info(
        `Payment not found by intent ID, trying to find by payment record ID: ${paymentIntent.metadata.payment_record_id}`,
      );
      payment = await this.paymentRepository.findById(
        paymentIntent.metadata.payment_record_id,
      );

      if (payment) {
        await this.paymentRepository.updatePaymentIntent(
          payment._id.toString(),
          paymentIntent.id,
        );
        this.logger.info(
          `Updated payment ${payment._id} with payment intent ID ${paymentIntent.id}`,
        );
      }
    }

    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id} and metadata ${JSON.stringify(paymentIntent.metadata)}`,
      );
      return null;
    }

    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PAID,
    );

    if (updatedPayment && updatedPayment.tripId) {
      await this.tripPaymentService.handlePaymentSuccess(updatedPayment);
      this.logger.info(
        `Handled trip payment success for trip ${updatedPayment.tripId}`,
      );
    }

    return updatedPayment;
  }

  /**
   * Handle failed payment webhook
   */
  async handlePaymentFailure(paymentIntent: any): Promise<any> {
    this.logger.info(`Payment failed for intent ${paymentIntent.id}`);

    let payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );

    if (!payment && paymentIntent.metadata?.payment_record_id) {
      this.logger.info(
        `Payment not found by intent ID, trying to find by payment record ID: ${paymentIntent.metadata.payment_record_id}`,
      );
      payment = await this.paymentRepository.findById(
        paymentIntent.metadata.payment_record_id,
      );

      if (payment) {
        await this.paymentRepository.updatePaymentIntent(
          payment._id.toString(),
          paymentIntent.id,
        );
        this.logger.info(
          `Updated payment ${payment._id} with payment intent ID ${paymentIntent.id}`,
        );
      }
    }

    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id} and metadata ${JSON.stringify(paymentIntent.metadata)}`,
      );
      return null;
    }

    const errorMessage =
      paymentIntent.last_payment_error?.message || 'Payment failed';

    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.FAILED,
      errorMessage,
    );

    if (updatedPayment && updatedPayment.tripId) {
      await this.tripPaymentService.handlePaymentFailure(updatedPayment);
      this.logger.info(
        `Handled trip payment failure for trip ${updatedPayment.tripId}`,
      );
    }

    return updatedPayment;
  }

  /**
   * Handle cancelled payment webhook
   */
  async handlePaymentCancellation(paymentIntent: any): Promise<any> {
    this.logger.info(`Payment cancelled for intent ${paymentIntent.id}`);

    let payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );

    if (!payment && paymentIntent.metadata?.payment_record_id) {
      this.logger.info(
        `Payment not found by intent ID, trying to find by payment record ID: ${paymentIntent.metadata.payment_record_id}`,
      );
      payment = await this.paymentRepository.findById(
        paymentIntent.metadata.payment_record_id,
      );

      if (payment) {
        await this.paymentRepository.updatePaymentIntent(
          payment._id.toString(),
          paymentIntent.id,
        );
        this.logger.info(
          `Updated payment ${payment._id} with payment intent ID ${paymentIntent.id}`,
        );
      }
    }

    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id} and metadata ${JSON.stringify(paymentIntent.metadata)}`,
      );
      return null;
    }

    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.CANCELLED,
    );

    if (updatedPayment && updatedPayment.tripId) {
      await this.tripPaymentService.handlePaymentFailure(updatedPayment);
      this.logger.info(
        `Handled trip payment cancellation for trip ${updatedPayment.tripId}`,
      );
    }

    return updatedPayment;
  }

  /**
   * Handle Setup Intent succeeded webhook (for payment method addition)
   */
  async handleSetupIntentSuccess(setupIntent: any): Promise<any> {
    this.logger.info(`Setup Intent succeeded for ${setupIntent.id}`);

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
    this.logger.info(`Payment requires action for intent ${paymentIntent.id}`);

    let payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );

    if (!payment && paymentIntent.metadata?.payment_record_id) {
      this.logger.info(
        `Payment not found by intent ID, trying to find by payment record ID: ${paymentIntent.metadata.payment_record_id}`,
      );
      payment = await this.paymentRepository.findById(
        paymentIntent.metadata.payment_record_id,
      );

      if (payment) {
        await this.paymentRepository.updatePaymentIntent(
          payment._id.toString(),
          paymentIntent.id,
        );
        this.logger.info(
          `Updated payment ${payment._id} with payment intent ID ${paymentIntent.id}`,
        );
      }
    }

    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id} and metadata ${JSON.stringify(paymentIntent.metadata)}`,
      );
      return null;
    }

    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PENDING,
      'Waiting for 3D Secure authentication',
    );

    this.logger.info(
      `Payment ${payment._id} updated to pending status for 3D Secure`,
    );

    return updatedPayment;
  }

  /**
   * Handle Payment Intent processing
   */
  async handlePaymentProcessing(paymentIntent: any): Promise<any> {
    this.logger.info(`Payment processing for intent ${paymentIntent.id}`);

    let payment = await this.paymentRepository.findByPaymentIntentId(
      paymentIntent.id,
    );

    if (!payment && paymentIntent.metadata?.payment_record_id) {
      this.logger.info(
        `Payment not found by intent ID, trying to find by payment record ID: ${paymentIntent.metadata.payment_record_id}`,
      );
      payment = await this.paymentRepository.findById(
        paymentIntent.metadata.payment_record_id,
      );

      if (payment) {
        await this.paymentRepository.updatePaymentIntent(
          payment._id.toString(),
          paymentIntent.id,
        );
        this.logger.info(
          `Updated payment ${payment._id} with payment intent ID ${paymentIntent.id}`,
        );
      }
    }

    if (!payment) {
      this.logger.warn(
        `No payment record found for intent ${paymentIntent.id} and metadata ${JSON.stringify(paymentIntent.metadata)}`,
      );
      return null;
    }

    const updatedPayment = await this.paymentRepository.updateStatus(
      payment._id,
      PaymentStatus.PROCESSING,
    );

    this.logger.info(`Payment ${payment._id} updated to processing status`);

    return updatedPayment;
  }
}
