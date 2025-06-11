import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TripRequestJob, JobResult } from '../interfaces/queue-job.interface';
import { TripService } from '../../modules/trip/services/trip.service';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { EventService } from '../../modules/event/event.service';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { DriverAvailabilityStatus } from '../../websocket/dto/driver-location.dto';
import { TripQueueService } from '../services/trip-queue.service';

@Processor('trip-requests')
@Injectable()
export class TripRequestProcessor extends WorkerHost {
  private readonly logger = new Logger(TripRequestProcessor.name);

  constructor(
    private readonly tripService: TripService,
    private readonly driverStatusService: DriverStatusService,
    private readonly eventService: EventService,
    private readonly tripQueueService: TripQueueService,
  ) {
    super();
  }

  async process(job: Job<TripRequestJob, any, string>): Promise<JobResult> {
    switch (job.name) {
      case 'process-trip-request':
        return this.handleTripRequest(job);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleTripRequest(
    job: Job<TripRequestJob>,
  ): Promise<JobResult> {
    const { tripId, driverId, customerLocation, tripData } = job.data;

    this.logger.debug(
      `Processing trip request: tripId=${tripId}, driverId=${driverId}, attempt=${job.attemptsMade + 1}/${job.opts.attempts}`,
    );

    try {
      // 1. Validate trip still exists and is in correct status
      const trip = await this.tripService.findById(tripId);
      if (!trip) {
        this.logger.warn(
          `Trip ${tripId} not found, clearing driver processing status`,
        );
        await this.tripQueueService.handleDriverTimeout(driverId, tripId);
        return {
          success: false,
          message: 'Trip not found',
          nextAction: 'complete',
        };
      }

      if (trip.status !== TripStatus.WAITING_FOR_DRIVER) {
        this.logger.debug(
          `Trip ${tripId} status is ${trip.status}, not waiting for driver`,
        );
        await this.tripQueueService.handleDriverTimeout(driverId, tripId);
        return {
          success: false,
          message: `Trip status is ${trip.status}`,
          nextAction: 'complete',
        };
      }

      // 2. Check if driver is still available
      const driverStatus =
        await this.driverStatusService.getDriverAvailability(driverId);
      if (
        !driverStatus ||
        driverStatus !== DriverAvailabilityStatus.AVAILABLE
      ) {
        this.logger.debug(
          `Driver ${driverId} is not available (status: ${driverStatus})`,
        );
        await this.tripQueueService.handleDriverTimeout(driverId, tripId);
        return {
          success: false,
          message: 'Driver not available',
          shouldRetry: false,
          nextAction: 'next_driver',
        };
      }

      // 3. Check if driver is currently processing this trip (sequential system)
      const processingTrip =
        await this.tripQueueService.getDriverQueueStatus(driverId);
      if (processingTrip.currentProcessing !== tripId) {
        this.logger.debug(
          `Driver ${driverId} is not processing trip ${tripId}, current: ${processingTrip.currentProcessing}`,
        );
        return {
          success: false,
          message: 'Driver not processing this trip',
          shouldRetry: false,
          nextAction: 'complete',
        };
      }

      // 4. Send trip request notification to driver
      await this.eventService.notifyNewTripRequest(trip, [driverId]);

      this.logger.log(
        `Successfully sent trip request ${tripId} to driver ${driverId}`,
      );

      return {
        success: true,
        message: 'Trip request sent to driver',
        data: { tripId, driverId },
      };
    } catch (error) {
      this.logger.error(
        `Error processing trip request ${tripId} for driver ${driverId}: ${error.message}`,
        error.stack,
      );

      // Clear processing status on error and try next trip
      await this.tripQueueService.handleDriverTimeout(driverId, tripId);

      return {
        success: false,
        message: error.message,
        shouldRetry: false, // Don't retry, move to next trip
      };
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job<TripRequestJob>) {
    this.logger.debug(
      `Processing job ${job.id}: tripId=${job.data.tripId}, driverId=${job.data.driverId}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<TripRequestJob>, result: JobResult) {
    if (result.success) {
      this.logger.log(
        `Completed job ${job.id}: tripId=${job.data.tripId}, driverId=${job.data.driverId}`,
      );
    } else {
      this.logger.warn(
        `Job ${job.id} completed with failure: ${result.message}`,
      );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TripRequestJob>, error: Error) {
    this.logger.error(
      `Job ${job.id} failed: tripId=${job.data.tripId}, driverId=${job.data.driverId}, error=${error.message}`,
    );

    // If job has exhausted all retries, handle next driver logic
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await this.handleJobExhausted(job);
    }
  }

  private async handleJobExhausted(job: Job<TripRequestJob>): Promise<void> {
    const { tripId, driverId, originalDriverIds, customerLocation } = job.data;

    this.logger.warn(
      `Job exhausted for trip ${tripId} and driver ${driverId}, attempting next driver`,
    );

    try {
      // Find next available driver from original list
      if (originalDriverIds && originalDriverIds.length > 0) {
        const currentDriverIndex = originalDriverIds.indexOf(driverId);
        const nextDriverIndex = currentDriverIndex + 1;

        if (nextDriverIndex < originalDriverIds.length) {
          const nextDriverId = originalDriverIds[nextDriverIndex];

          // Create job for next driver
          await this.tripQueueService.addTripRequest({
            tripId,
            driverId: nextDriverId,
            priority: 1, // High priority for retry
            customerLocation,
            tripData: job.data.tripData,
            retryCount: (job.data.retryCount || 0) + 1,
            originalDriverIds,
          });

          this.logger.log(
            `Created job for next driver ${nextDriverId} for trip ${tripId}`,
          );
          return;
        }
      }

      // No more drivers available, update trip status
      await this.tripService.updateTripStatus(
        tripId,
        TripStatus.DRIVER_NOT_FOUND,
      );

      // Notify customer that no driver was found
      const trip = await this.tripService.findById(tripId);
      if (trip) {
        await this.eventService.notifyCustomerDriverNotFound(
          trip,
          trip.customer.id,
        );
      }

      this.logger.warn(`No more drivers available for trip ${tripId}`);
    } catch (error) {
      this.logger.error(
        `Error handling exhausted job for trip ${tripId}: ${error.message}`,
      );
    }
  }
}
