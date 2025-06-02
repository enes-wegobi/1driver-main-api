import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TripTimeoutJob, JobResult } from '../interfaces/queue-job.interface';
import { TripService } from '../../modules/trip/services/trip.service';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { EventService } from '../../modules/event/event.service';
import { TripQueueService } from '../services/trip-queue.service';

@Processor('trip-timeouts')
@Injectable()
export class TripTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(TripTimeoutProcessor.name);

  constructor(
    private readonly tripService: TripService,
    private readonly eventService: EventService,
    private readonly tripQueueService: TripQueueService,
  ) {
    super();
    // WORKER BAŞLANGICI KONTROLÜ
    this.logger.log('🚀 TIMEOUT PROCESSOR INITIALIZED - Worker is ready to process jobs');
  }

  async process(job: Job<TripTimeoutJob, any, string>): Promise<JobResult> {
    this.logger.log(`🔥 TIMEOUT PROCESSOR STARTED: jobId=${job.id}, jobName=${job.name}, data=${JSON.stringify(job.data)}`);
    
    switch (job.name) {
      case 'timeout-trip-request':
        return this.handleTripTimeout(job);
      default:
        this.logger.error(`❌ UNKNOWN JOB TYPE: ${job.name} - Available types: timeout-trip-request`);
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleTripTimeout(
    job: Job<TripTimeoutJob>,
  ): Promise<JobResult> {
    const { tripId, driverId, timeoutType } = job.data;

    this.logger.log(
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

        // Add driver to rejected list (treat timeout as rejection)
        const rejectedDriverIds = [...(trip.rejectedDriverIds || [])];
        if (!rejectedDriverIds.includes(driverId)) {
          rejectedDriverIds.push(driverId);
        }

        const result = await this.tripService.updateTrip(tripId, {
          rejectedDriverIds,
        });
        if (result.success && result.trip) {
          const updatedTrip = result.trip;

          if (this.areAllDriversRejected(updatedTrip)) {
            await this.eventService.notifyCustomerDriverNotFound(
              updatedTrip,
              updatedTrip.customer.id,
            );
            this.logger.log(
              `All drivers rejected for trip ${tripId}, notified customer`,
            );
          }
          this.logger.log(
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
    this.logger.log('✅ TIMEOUT WORKER READY - Worker is now listening for jobs');
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
    this.logger.log(
      `🔥 TIMEOUT PROCESSOR ACTIVE: Processing timeout job ${job.id}: tripId=${job.data.tripId}, driverId=${job.data.driverId}, type=${job.data.timeoutType}`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<TripTimeoutJob>, result: JobResult) {
    this.logger.log(`✅ TIMEOUT PROCESSOR COMPLETED: job ${job.id}: ${result.message}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<TripTimeoutJob>, error: Error) {
    this.logger.error(`❌ TIMEOUT PROCESSOR FAILED: job ${job.id} failed: ${error.message}`);
  }

  private areAllDriversRejected(trip: any): boolean {
    return (
      trip &&
      trip.calledDriverIds &&
      trip.rejectedDriverIds &&
      trip.calledDriverIds.length === trip.rejectedDriverIds.length &&
      trip.calledDriverIds.length > 0
    );
  }
}
