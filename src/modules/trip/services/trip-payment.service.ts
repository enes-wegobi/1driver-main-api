import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { TripService } from './trip.service';
import { PaymentsService } from '../../payments/services/payments.service';
import { PaymentMethodService } from '../../payments/services/payment-method.service';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { EventType } from '../../event/enum/event-type.enum';
import { TripDocument } from '../schemas/trip.schema';
import { Payment } from '../../payments/schemas/payment.schema';
import { Event2Service } from 'src/modules/event/event_v2.service';
import { UserType } from 'src/common/user-type.enum';
import { DriverEarningsService } from 'src/modules/drivers/services/driver-earnings.service';
import { LockService } from 'src/lock/lock.service';
import { LoggerService } from 'src/logger/logger.service';

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
  constructor(
    private readonly tripService: TripService,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: PaymentsService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly event2Service: Event2Service,
    private readonly lockService: LockService,
    private readonly driverEarningsService: DriverEarningsService,
    private readonly logger: LoggerService,
  ) {}

  async processTripPayment(
    customerId: string,
    paymentMethodId: string,
  ): Promise<TripPaymentResult> {
    this.logger.info(
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

  private async executePaymentProcess(
    customerId: string,
    paymentMethodId: string,
    trip: TripDocument,
    isRetry: boolean = false,
  ): Promise<TripPaymentResult> {
    try {
      this.validateTripForPayment(trip);

      // Validate payment method belongs to customer
      const stripePaymaymentMethodId = await this.validatePaymentMethod(
        customerId,
        paymentMethodId,
      );

      const paymentResult = await this.paymentsService.createTripPayment(
        customerId,
        trip.finalCost,
        'aed',
        stripePaymaymentMethodId,
        paymentMethodId,
        trip._id.toString(),
        {
          tripId: trip._id.toString(),
          driverId: trip.driver?.id,
          isRetry: isRetry,
        },
      );

      await this.updateTripPaymentStatus(trip._id, PaymentStatus.PROCESSING);

      await this.notifyPaymentStarted(trip, paymentResult.payment, isRetry);

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

  private async updateTripPaymentStatus(
    tripId: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await this.tripService.updateTrip(tripId, { paymentStatus });
  }

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

    await this.event2Service.sendToUser(
      trip.customer.id,
      eventType,
      eventData,
      UserType.CUSTOMER,
    );
    await this.event2Service.sendToUser(
      trip.driver.id,
      eventType,
      eventData,
      UserType.DRIVER,
    );
  }

  async handlePaymentSuccess(payment: Payment): Promise<void> {
    if (!payment.tripId) {
      return;
    }

    this.logger.info(`Handling payment success for trip ${payment.tripId}`);

    const trip = await this.tripService.findById(payment.tripId);
    if (!trip) {
      this.logger.warn(`Trip not found for payment ${payment._id}`);
      return;
    }

    if (trip.driver?.id && trip.actualDuration) {
      try {
        const earningsCalculation =
          this.driverEarningsService.calculateTripEarnings(trip.actualDuration);

        await this.driverEarningsService.addTripToWeeklyEarnings(
          trip.driver.id,
          {
            tripId: trip._id.toString(),
            tripDate: trip.tripEndTime || new Date(),
            duration: trip.actualDuration,
            multiplier: earningsCalculation.multiplier,
            earnings: earningsCalculation.earnings,
          },
        );

        this.logger.info(
          `Driver earnings calculated for trip ${trip._id}: ${earningsCalculation.earnings} TL (${trip.actualDuration}s × ${earningsCalculation.multiplier})`,
        );
      } catch (error) {
        this.logger.error(
          `Error calculating driver earnings for trip ${trip._id}: ${error.message}`,
          error.stack,
        );
      }
    }

    const updatedTrip = await this.tripService.updateTripWithData(
      trip._id.toString(),
      {
        status: TripStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethodId: payment.paymentMethodId,
      },
    );

    await this.tripService.cleanupCompletedTrip(
      trip.driver.id,
      trip.customer.id,
    );

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
    await this.event2Service.sendToUser(
      updatedTrip.customer.id,
      EventType.TRIP_PAYMENT_SUCCESS,
      eventData,
      UserType.CUSTOMER,
    );
    await this.event2Service.sendToUser(
      updatedTrip.driver.id,
      EventType.TRIP_PAYMENT_SUCCESS,
      eventData,
      UserType.DRIVER,
    );
  }

  async handlePaymentFailure(payment: Payment): Promise<void> {
    if (!payment.tripId) {
      return;
    }

    this.logger.info(`Handling payment failure for trip ${payment.tripId}`);

    const trip = await this.tripService.findById(payment.tripId);
    if (!trip) {
      this.logger.warn(`Trip not found for payment ${payment._id}`);
      return;
    }

    await this.tripService.updateTripWithData(trip._id.toString(), {
      status: TripStatus.PAYMENT_RETRY,
      paymentStatus: PaymentStatus.FAILED,
    });

    if (trip.driver && trip.driver.id) {
      await this.tripService.cleanupDriverTrip(trip.driver.id);
      this.logger.info(
        `Removed driver ${trip.driver.id} active trip due to payment failure`,
      );
    }

    const updatedTrip = await this.tripService.findById(trip._id);
    if (!updatedTrip) {
      this.logger.warn(`Updated trip not found for payment ${payment._id}`);
      return;
    }

    const eventData = {
      eventType: EventType.TRIP_PAYMENT_FAILED,
      tripId: trip._id,
      timestamp: new Date().toISOString(),
      payment,
      trip: updatedTrip,
    };

    await this.event2Service.sendToUser(
      updatedTrip.customer.id,
      EventType.TRIP_PAYMENT_FAILED,
      eventData,
      UserType.CUSTOMER,
    );
    await this.event2Service.sendToUser(
      trip.driver.id,
      EventType.TRIP_PAYMENT_FAILED,
      eventData,
      UserType.DRIVER,
    );
  }
}
