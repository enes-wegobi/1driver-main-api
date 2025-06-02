import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { TripRepository } from '../repositories/trip.repository';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { UserType } from 'src/common/user-type.enum';
import { EventService } from '../../event/event.service';
import { TripDocument } from '../schemas/trip.schema';
import { TripService } from './trip.service';
import { DriverRequestQueueService } from 'src/redis/services/driver-request-queue.service';

@Injectable()
export class TripTimeoutService {
  private readonly logger = new Logger(TripTimeoutService.name);
  private readonly driverResponseTimeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly tripRepository: TripRepository,
    private readonly activeTripService: ActiveTripService,
    private readonly eventService: EventService,
    private readonly tripService: TripService,
    private readonly driverRequestQueueService: DriverRequestQueueService,
  ) {
    this.driverResponseTimeout = this.configService.get<number>(
      'tripDriverResponseTimeout',
      120, // Default 2 minutes
    );
  }

  /**
   * Cron job that runs every 30 seconds to check for timed-out trips
   * Uses dynamic interval from configuration
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleTripTimeouts(): Promise<void> {
    try {
      this.logger.debug('Checking for timed-out trips...');

      const timedOutTrips = await this.tripRepository.findTimedOutTrips(
        this.driverResponseTimeout,
      );

      if (timedOutTrips.length === 0) {
        this.logger.debug('No timed-out trips found');
        return;
      }

      this.logger.log(
        `Found ${timedOutTrips.length} timed-out trip(s), processing...`,
      );

      const processPromises = timedOutTrips.map((trip) =>
        this.processTimedOutTrip(trip),
      );

      const results = await Promise.allSettled(processPromises);

      // Log results
      const successful = results.filter(
        (result) => result.status === 'fulfilled',
      ).length;
      const failed = results.filter(
        (result) => result.status === 'rejected',
      ).length;

      this.logger.log(
        `Trip timeout processing completed: ${successful} successful, ${failed} failed`,
      );

      // Log failed operations
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          this.logger.error(
            `Failed to process timeout for trip ${timedOutTrips[index]._id}: ${result.reason}`,
          );
        }
      });
    } catch (error) {
      this.logger.error(`Error in handleTripTimeouts: ${error.message}`);
    }
  }

  /**
   * Process a single timed-out trip
   */
  private async processTimedOutTrip(trip: TripDocument): Promise<void> {
    try {
      this.logger.log(
        `Processing timeout for trip ${trip._id} (customer: ${trip.customer.id})`,
      );

      // QUEUE MANAGEMENT: Remove this trip from all queues
      await this.driverRequestQueueService.removeRequestFromAllQueues(trip._id);

      // Update trip status to DRIVER_NOT_FOUND
      const updatedTrip = await this.tripRepository.findByIdAndUpdate(
        trip._id,
        {
          status: TripStatus.DRIVER_NOT_FOUND,
        },
      );

      if (!updatedTrip) {
        throw new Error(`Failed to update trip ${trip._id} status`);
      }

      // Clean up customer's active trip
      await this.activeTripService.removeUserActiveTrip(
        trip.customer.id,
        UserType.CUSTOMER,
      );

      // QUEUE MANAGEMENT: Process next queued requests for affected drivers
      for (const driverId of trip.calledDriverIds) {
        const currentRequest = await this.driverRequestQueueService.getDriverCurrentRequest(driverId);
        if (currentRequest === trip._id) {
          // Clear current request and process next in queue
          await this.driverRequestQueueService.clearDriverCurrentRequest(driverId);
          await this.processNextQueuedRequestForDriver(driverId);
        }
      }

      // Notify remaining drivers that trip is no longer available
      const remainingDriverIds = updatedTrip.calledDriverIds.filter(
        (id) => !updatedTrip.rejectedDriverIds.includes(id)
      );

      if (remainingDriverIds.length > 0) {
        await this.eventService.notifyTripAlreadyTaken(
          updatedTrip,
          remainingDriverIds,
        );
      }

      // Notify customer that no driver was found
      await this.eventService.notifyCustomerDriverNotFound(
        updatedTrip,
        trip.customer.id,
      );

      this.logger.log(
        `Successfully processed timeout for trip ${trip._id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing timeout for trip ${trip._id}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Process next queued request for a driver (transparent queue management)
   */
  private async processNextQueuedRequestForDriver(driverId: string): Promise<void> {
    try {
      const nextTripId = await this.driverRequestQueueService.getNextRequestForDriver(driverId);
      
      if (nextTripId) {
        // Set as current request and remove from queue
        await this.driverRequestQueueService.setDriverCurrentRequest(driverId, nextTripId);
        await this.driverRequestQueueService.removeRequestFromDriverQueue(driverId, nextTripId);
        
        // Check if trip is still valid
        const trip = await this.tripService.findById(nextTripId);
        if (trip && trip.status === TripStatus.WAITING_FOR_DRIVER) {
          // Send normal trip request notification (transparent to driver)
          await this.eventService.notifyNewTripRequest(trip, [driverId]);
          this.logger.debug(`Sent queued trip ${nextTripId} to driver ${driverId} after timeout cleanup`);
        } else {
          // Trip is no longer valid, clear current request and try next
          await this.driverRequestQueueService.clearDriverCurrentRequest(driverId);
          await this.processNextQueuedRequestForDriver(driverId);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing next queued request for driver ${driverId}: ${error.message}`);
    }
  }

  /**
   * Notify drivers who haven't responded yet that the trip has timed out
   */
  private async notifyRemainingDrivers(trip: TripDocument): Promise<void> {
    if (!trip.calledDriverIds || trip.calledDriverIds.length === 0) {
      return;
    }

    // Find drivers who haven't rejected the trip yet
    const remainingDriverIds = trip.calledDriverIds.filter(
      (driverId) => !trip.rejectedDriverIds?.includes(driverId),
    );

    if (remainingDriverIds.length > 0) {
      this.logger.log(
        `Notifying ${remainingDriverIds.length} remaining drivers about trip timeout for trip ${trip._id}`,
      );

      await this.eventService.notifyTripAlreadyTaken(
        trip,
        remainingDriverIds,
      );
    }
  }

  /**
   * Manual method to process timeouts (for testing or manual triggers)
   */
  async processTimeoutsManually(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    this.logger.log('Manual timeout processing triggered');

    const timedOutTrips = await this.tripRepository.findTimedOutTrips(
      this.driverResponseTimeout,
    );

    if (timedOutTrips.length === 0) {
      return { processed: 0, successful: 0, failed: 0 };
    }

    const processPromises = timedOutTrips.map((trip) =>
      this.processTimedOutTrip(trip),
    );

    const results = await Promise.allSettled(processPromises);

    const successful = results.filter(
      (result) => result.status === 'fulfilled',
    ).length;
    const failed = results.filter(
      (result) => result.status === 'rejected',
    ).length;

    return {
      processed: timedOutTrips.length,
      successful,
      failed,
    };
  }

  /**
   * Get current timeout configuration
   */
  getTimeoutConfiguration(): {
    driverResponseTimeoutSeconds: number;
    driverResponseTimeoutMinutes: number;
  } {
    return {
      driverResponseTimeoutSeconds: this.driverResponseTimeout,
      driverResponseTimeoutMinutes: Math.round(this.driverResponseTimeout / 60),
    };
  }
}
