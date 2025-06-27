import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TripTimeoutJob, JobResult } from '../interfaces/queue-job.interface';
import { TripService } from '../../modules/trip/services/trip.service';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { TripQueueService } from '../services/trip-queue.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { Event2Service } from 'src/modules/event/event_v2.service';
import { UserType } from 'src/common/user-type.enum';
import { LoggerService } from 'src/logger/logger.service';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { DriverTripQueueService } from 'src/redis/services/driver-trip-queue.service';

@Processor('trip-timeouts')
@Injectable()
export class TripTimeoutProcessor extends WorkerHost {
  constructor(
    private readonly tripService: TripService,
    private readonly event2Service: Event2Service,
    private readonly tripQueueService: TripQueueService,
    private readonly activeTripService: ActiveTripService,
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.info(
      '🚀 TIMEOUT PROCESSOR INITIALIZED - Worker is ready to process jobs',
    );
  }

  async process(job: Job<TripTimeoutJob, any, string>): Promise<JobResult> {
    this.logger.info(
      `🔥 TIMEOUT PROCESSOR STARTED: jobId=${job.id}, jobName=${job.name}, data=${JSON.stringify(job.data)}`,
    );

    switch (job.name) {
      case 'timeout-trip-request':
        return this.handleTripTimeout(job);
      default:
        this.logger.error(
          `❌ UNKNOWN JOB TYPE: ${job.name} - Available types: timeout-trip-request`,
        );
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleTripTimeout(
    job: Job<TripTimeoutJob>,
  ): Promise<JobResult> {
    const { tripId, driverId, timeoutType } = job.data;

    this.logger.info(
      `⏰ TIMEOUT PROCESSOR: Processing trip timeout: tripId=${tripId}, driverId=${driverId}, type=${timeoutType}`,
    );

    try {
      // Check if trip still exists and is in waiting status
      const trip = await this.tripService.findById(tripId);
      if (!trip) {
        this.logger.warn(`Trip ${tripId} not found, timeout job completed`);
        return {
          success: true,
          message: 'Trip not found - timeout no longer needed',
        };
      }

      // Only handle driver response timeout for now
      if (
        timeoutType === 'driver_response' &&
        trip.status === TripStatus.WAITING_FOR_DRIVER
      ) {
        // Check if driver already responded
        if (
          trip.driver?.id === driverId ||
          trip.rejectedDriverIds?.includes(driverId)
        ) {
          this.logger.debug(
            `Driver ${driverId} already responded to trip ${tripId}`,
          );
          return {
            success: true,
            message: 'Driver already responded',
          };
        }

        // Use NEW SEQUENTIAL SYSTEM: Handle driver timeout
        await this.tripQueueService.handleDriverTimeout(driverId, tripId);
        await this.driverTripQueueService.clearDriverLastRequest(driverId);

        // Add driver to rejected list (treat timeout as rejection)
        const rejectedDriverIds = [...(trip.rejectedDriverIds || [])];
        if (!rejectedDriverIds.includes(driverId)) {
          rejectedDriverIds.push(driverId);
        }

        const result = await this.tripService.updateTrip(tripId, {
          rejectedDriverIds,
          status: this.areAllDriversRejected(rejectedDriverIds, trip.calledDriverIds) ? TripStatus.DRIVER_NOT_FOUND : trip.status
        });
        if (result.success && result.trip) {
          const updatedTrip = result.trip;

          // Send TRIP_ALREADY_TAKEN event to the timed-out driver
          await this.event2Service.sendToUser(
            driverId,
            EventType.TRIP_ALREADY_TAKEN,
            updatedTrip,
            UserType.DRIVER,
          );
          this.logger.info(
            `Sent TRIP_ALREADY_TAKEN event to timed-out driver ${driverId} for trip ${tripId}`,
          );

          if (this.areAllDriversRejected(rejectedDriverIds, trip.calledDriverIds)) {
            await this.event2Service.sendToUser(
              updatedTrip.customer.id,
              EventType.TRIP_DRIVER_NOT_FOUND,
              updatedTrip,
              UserType.CUSTOMER,
            );
            this.logger.info(
              `All drivers rejected for trip ${tripId}, notified customer`,
            );
          }
          this.logger.info(
            `Driver ${driverId} timed out for trip ${tripId}, processing next trip in queue`,
          );
        }
      }
      return {
        success: true,
        message: 'Timeout handled',
      };
    } catch (error) {
      this.logger.error(
        `Error processing timeout for trip ${tripId}: ${error.message}`,
      );

      return {
        success: false,
        message: error.message,
      };
    }
  }

  // WORKER EVENT'LERİNE DETAYLI LOGLAR
  @OnWorkerEvent('ready')
  onReady() {
    this.logger.info(
      '✅ TIMEOUT WORKER READY - Worker is now listening for jobs',
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('❌ TIMEOUT WORKER ERROR:', error);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`⚠️ TIMEOUT JOB STALLED: ${jobId}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<TripTimeoutJob>) {
    this.logger.info(
      `🔥 TIMEOUT PROCESSOR ACTIVE: Processing timeout job ${job.id}: tripId=${job.data.tripId}, driverId=${job.data.driverId}, type=${job.data.timeoutType}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<TripTimeoutJob>, result: JobResult) {
    this.logger.info(
      `✅ TIMEOUT PROCESSOR COMPLETED: job ${job.id}: ${result.message}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<TripTimeoutJob>, error: Error) {
    this.logger.error(
      `❌ TIMEOUT PROCESSOR FAILED: job ${job.id} failed: ${error.message}`,
    );
  }

  private areAllDriversRejected(calledDriverIds: any, rejectedDriverIds: any): boolean {
    return (
      calledDriverIds &&
      rejectedDriverIds &&
      calledDriverIds.length === rejectedDriverIds.length &&
      calledDriverIds.length > 0
    );
  }
}
