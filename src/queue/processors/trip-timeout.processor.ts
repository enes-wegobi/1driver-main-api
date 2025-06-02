import {
  Process,
  Processor,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { TripTimeoutJob, JobResult } from '../interfaces/queue-job.interface';
import { TripService } from '../../modules/trip/services/trip.service';
import { TripStatus } from '../../common/enums/trip-status.enum';

@Processor('trip-timeouts')
@Injectable()
export class TripTimeoutProcessor {
  private readonly logger = new Logger(TripTimeoutProcessor.name);

  constructor(private readonly tripService: TripService) {}

  @Process('timeout-trip-request')
  async handleTripTimeout(job: Job<TripTimeoutJob>): Promise<JobResult> {
    const { tripId, driverId, timeoutType } = job.data;

    this.logger.debug(
      `Processing trip timeout: tripId=${tripId}, driverId=${driverId}, type=${timeoutType}`,
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

        // Add driver to rejected list (treat timeout as rejection)
        const rejectedDriverIds = [...(trip.rejectedDriverIds || [])];
        if (!rejectedDriverIds.includes(driverId)) {
          rejectedDriverIds.push(driverId);
        }

        await this.tripService.updateTrip(tripId, { rejectedDriverIds });

        this.logger.log(
          `Driver ${driverId} timed out for trip ${tripId}, added to rejected list`,
        );
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

  @OnQueueActive()
  onActive(job: Job<TripTimeoutJob>) {
    this.logger.debug(
      `Processing timeout job ${job.id}: tripId=${job.data.tripId}, type=${job.data.timeoutType}`,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job<TripTimeoutJob>, result: JobResult) {
    this.logger.debug(`Completed timeout job ${job.id}: ${result.message}`);
  }

  @OnQueueFailed()
  onFailed(job: Job<TripTimeoutJob>, error: Error) {
    this.logger.error(`Timeout job ${job.id} failed: ${error.message}`);
  }
}
