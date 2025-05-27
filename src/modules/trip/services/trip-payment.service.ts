import {
  Injectable,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { PaymentsService } from '../../payments/payments.service';
import { PaymentMethodService } from '../../payments/payment-method.service';
import { EventService } from '../../event/event.service';
import { LockService } from 'src/common/lock/lock.service';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { EventType } from '../../event/enum/event-type.enum';
import { TripDocument } from '../schemas/trip.schema';
import { Payment } from '../../payments/schemas/payment.schema';

export interface TripPaymentResult {
  success: boolean;
  payment?: Payment;
  trip?: TripDocument;
  message?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
}

@Injectable()
export class TripPaymentService {
  private readonly logger = new Logger(TripPaymentService.name);

  constructor(
    private readonly tripService: TripService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly eventService: EventService,
    private readonly lockService: LockService,
  ) {}

  /**
   * Process payment for customer's active trip
   */
  async processTripPayment(
    customerId: string,
    paymentMethodId: string,
  ): Promise<TripPaymentResult> {
    this.logger.log(
      `Processing trip payment for customer ${customerId} with payment method ${paymentMethodId}`,
    );

    // Get customer's active trip
    const activeTripResult =
      await this.tripService.getCustomerActiveTrip(customerId);
    if (!activeTripResult.success || !activeTripResult.trip) {
      throw new BadRequestException('No active trip found for customer');
    }

    const trip = activeTripResult.trip;
    const tripId = trip._id.toString();

    return this.lockService.executeWithLock(
      `trip-payment:${tripId}`,
      async () => {
        return this.executePaymentProcess(customerId, paymentMethodId, trip);
      },
      'Trip payment is currently being processed. Please try again.',
      60000, // 60 seconds timeout
      2, // 2 retries
    );
  }

  /**
   * Get payment status for customer's active trip
   */
  async getTripPaymentStatus(customerId: string): Promise<any> {
    this.logger.log(`Getting trip payment status for customer ${customerId}`);

    // Get customer's active trip
    const activeTripResult =
      await this.tripService.getCustomerActiveTrip(customerId);
    if (!activeTripResult.success || !activeTripResult.trip) {
      throw new BadRequestException('No active trip found for customer');
    }

    const trip = activeTripResult.trip;
    const tripId = trip._id;

    // Get payment history for this trip
    const paymentHistory =
      await this.paymentsService.getPaymentHistory(customerId);
    const tripPayments = paymentHistory.filter(
      (payment) => payment.tripId === tripId,
    );

    // Get current payment (latest one) - using _id for sorting (ObjectId contains timestamp)
    const currentPayment =
      tripPayments.length > 0
        ? tripPayments.sort((a, b) => b._id.localeCompare(a._id))[0]
        : null;

    return {
      success: true,
      trip: {
        id: trip._id,
        status: trip.status,
        paymentStatus: trip.paymentStatus,
        finalCost: trip.finalCost,
      },
      currentPayment,
      paymentHistory: tripPayments,
    };
  }

  /**
   * Execute the actual payment process
   */
  private async executePaymentProcess(
    customerId: string,
    paymentMethodId: string,
    trip: TripDocument,
    isRetry: boolean = false,
  ): Promise<TripPaymentResult> {
    try {
      // Validate trip status
      this.validateTripForPayment(trip);

      // Validate payment method belongs to customer
      const stripePaymaymentMethodId = await this.validatePaymentMethod(
        customerId,
        paymentMethodId,
      );

      // Create off-session payment for trip
      const paymentResult = await this.paymentsService.createTripPayment(
        customerId,
        trip.finalCost,
        'eur',
        stripePaymaymentMethodId,
        trip._id.toString(),
        {
          tripId: trip._id.toString(),
          driverId: trip.driver?.id,
          isRetry: isRetry,
        },
      );

      // Update trip payment status to processing
      await this.updateTripPaymentStatus(trip._id, PaymentStatus.PROCESSING);

      // Send events to both customer and driver
      await this.notifyPaymentStarted(trip, paymentResult.payment, isRetry);

      // Get updated trip
      const updatedTrip = await this.tripService.findById(trip._id);

      return {
        success: true,
        payment: paymentResult.payment,
        trip: updatedTrip || undefined,
        requiresAction: paymentResult.requiresAction,
        clientSecret: paymentResult.clientSecret,
        paymentIntentId: paymentResult.paymentIntentId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing trip payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate trip is in correct status for payment
   */
  private validateTripForPayment(trip: TripDocument): void {
    if (trip.status !== TripStatus.PAYMENT) {
      throw new BadRequestException(
        `Trip status must be ${TripStatus.PAYMENT} to process payment. Current status: ${trip.status}`,
      );
    }

    if (!trip.finalCost || trip.finalCost <= 0) {
      throw new BadRequestException('Trip final cost is not set or invalid');
    }

    if (!trip.driver?.id) {
      throw new BadRequestException('Trip does not have an assigned driver');
    }
  }

  /**
   * Validate payment method belongs to customer and return Stripe payment method ID
   */
  private async validatePaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<string> {
    const paymentMethods =
      await this.paymentMethodService.getPaymentMethods(customerId);
    const paymentMethod = paymentMethods.find(
      (pm: any) => pm._id.toString() === paymentMethodId,
    );

    if (!paymentMethod) {
      throw new BadRequestException(
        'Payment method not found or does not belong to this customer',
      );
    }

    return paymentMethod.stripePaymentMethodId;
  }

  /**
   * Update trip payment status
   */
  private async updateTripPaymentStatus(
    tripId: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await this.tripService.updateTrip(tripId, { paymentStatus });
  }

  /**
   * Notify both customer and driver about payment started
   */
  private async notifyPaymentStarted(
    trip: TripDocument,
    payment: Payment,
    isRetry: boolean = false,
  ): Promise<void> {
    const eventType = isRetry
      ? EventType.TRIP_PAYMENT_RETRY
      : EventType.TRIP_PAYMENT_STARTED;

    const eventData = {
      eventType,
      tripId: trip._id,
      timestamp: new Date().toISOString(),
      payment,
      trip,
    };

    await this.eventService.sendToUser(trip.customer.id, eventType, eventData);
    await this.eventService.sendToUser(trip.driver.id, eventType, eventData);
  }

  async handlePaymentSuccess(payment: Payment): Promise<void> {
    if (!payment.tripId) {
      return;
    }

    this.logger.log(`Handling payment success for trip ${payment.tripId}`);

    const trip = await this.tripService.findById(payment.tripId);
    if (!trip) {
      this.logger.warn(`Trip not found for payment ${payment._id}`);
      return;
    }

    // Update trip status to completed
    await this.tripService.updateTripStatus(trip._id, TripStatus.COMPLETED);
    await this.updateTripPaymentStatus(trip._id, PaymentStatus.PAID);

    // Get updated trip
    const updatedTrip = await this.tripService.findById(trip._id);
    if (!updatedTrip) {
      this.logger.warn(`Updated trip not found for payment ${payment._id}`);
      return;
    }

    const eventData = {
      eventType: EventType.TRIP_PAYMENT_SUCCESS,
      tripId: trip._id,
      timestamp: new Date().toISOString(),
      payment,
      trip: updatedTrip,
    };

    await this.eventService.sendToUser(
      trip.customer.id,
      EventType.TRIP_PAYMENT_SUCCESS,
      eventData,
    );
    await this.eventService.sendToUser(
      trip.driver.id,
      EventType.TRIP_PAYMENT_SUCCESS,
      eventData,
    );
  }

  async handlePaymentFailure(payment: Payment): Promise<void> {
    if (!payment.tripId) {
      return;
    }

    this.logger.log(`Handling payment failure for trip ${payment.tripId}`);

    const trip = await this.tripService.findById(payment.tripId);
    if (!trip) {
      this.logger.warn(`Trip not found for payment ${payment._id}`);
      return;
    }

    // Update trip payment status to failed (keep trip status as PAYMENT for retry)
    await this.updateTripPaymentStatus(trip._id, PaymentStatus.FAILED);

    // Get updated trip
    const updatedTrip = await this.tripService.findById(trip._id);
    if (!updatedTrip) {
      this.logger.warn(`Updated trip not found for payment ${payment._id}`);
      return;
    }

    // Notify both customer and driver
    const eventData = {
      eventType: EventType.TRIP_PAYMENT_FAILED,
      tripId: trip._id,
      timestamp: new Date().toISOString(),
      payment,
      trip: updatedTrip,
    };

    await this.eventService.sendToUser(
      trip.customer.id,
      EventType.TRIP_PAYMENT_FAILED,
      eventData,
    );
    await this.eventService.sendToUser(
      trip.driver.id,
      EventType.TRIP_PAYMENT_FAILED,
      eventData,
    );
  }
}
