import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DriverTripQueueService } from '../../redis/services/driver-trip-queue.service';
import { TripQueueService } from './trip-queue.service';
import { EventService } from '../../modules/event/event.service';
import { DriverStatusService } from '../../redis/services/driver-status.service';

import { TripStatus } from '../../common/enums/trip-status.enum';
import { DriverAvailabilityStatus } from '../../websocket/dto/driver-location.dto';
import { TripService } from 'src/modules/trip/services/trip.service';

export interface ResponseResult {
  success: boolean;
  action: 'accepted' | 'declined' | 'timeout' | 'error';
  driverId: string;
  tripId: string;
  message?: string;
  cleanupStats?: {
    removedFromDriver: number;
    removedFromOthers: number;
    bullJobsRemoved: number;
  };
  nextProcessing?: {
    started: boolean;
    nextTripId?: string;
  };
}

@Injectable()
export class ResponseHandler {
  private readonly logger = new Logger(ResponseHandler.name);

  constructor(
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly tripQueueService: TripQueueService,
    private readonly eventService: EventService,
    private readonly driverStatusService: DriverStatusService,
    @Inject(forwardRef(() => TripService))
    private readonly tripService: TripService,
  ) {}

  /**
   * Handle driver response (accept/decline) with comprehensive error handling
   */
  async handleDriverResponse(
    driverId: string,
    tripId: string,
    accepted: boolean
  ): Promise<ResponseResult> {
    const startTime = Date.now();
    
    this.logger.log(
      `Handling driver response: driver=${driverId}, trip=${tripId}, accepted=${accepted}`
    );

    try {
      // 1. Validate the response is still valid
      const validationResult = await this.validateDriverResponse(driverId, tripId);
      if (!validationResult.valid) {
        return {
          success: false,
          action: 'error',
          driverId,
          tripId,
          message: validationResult.reason
        };
      }

      // 2. Clear processing status immediately
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);

      // 3. Handle based on response type
      let result: ResponseResult;
      if (accepted) {
        result = await this.handleDriverAccept(driverId, tripId);
      } else {
        result = await this.handleDriverDecline(driverId, tripId);
      }

      // 4. Log performance metrics
      const duration = Date.now() - startTime;
      this.logger.log(
        `Response handled in ${duration}ms: ${result.action} for driver ${driverId}, trip ${tripId}`
      );

      return result;

    } catch (error) {
      this.logger.error(
        `Error handling driver response: driver=${driverId}, trip=${tripId}, error=${error.message}`,
        error.stack
      );

      // Fallback cleanup
      await this.performFallbackCleanup(driverId, tripId);

      return {
        success: false,
        action: 'error',
        driverId,
        tripId,
        message: `Response handling failed: ${error.message}`
      };
    }
  }

  /**
   * Handle driver timeout with smart retry logic
   */
  async handleDriverTimeout(driverId: string, tripId: string): Promise<ResponseResult> {
    this.logger.log(`Handling timeout for driver ${driverId}, trip ${tripId}`);

    try {
      // 1. Check if driver is still processing this trip
      const currentProcessing = await this.driverTripQueueService.getDriverProcessingTrip(driverId);
      
      if (currentProcessing !== tripId) {
        this.logger.debug(
          `Driver ${driverId} not processing trip ${tripId} (current: ${currentProcessing}), skipping timeout`
        );
        return {
          success: false,
          action: 'timeout',
          driverId,
          tripId,
          message: 'Driver not processing this trip anymore'
        };
      }

      // 2. Check if trip is still valid
      const trip = await this.tripService.findById(tripId);
      if (!trip || trip.status !== TripStatus.WAITING_FOR_DRIVER) {
        this.logger.debug(
          `Trip ${tripId} no longer waiting for driver (status: ${trip?.status}), skipping timeout`
        );
        
        // Clean up processing status
        await this.driverTripQueueService.clearDriverProcessingTrip(driverId);
        
        return {
          success: false,
          action: 'timeout',
          driverId,
          tripId,
          message: `Trip no longer waiting (status: ${trip?.status})`
        };
      }

      // 3. Handle as decline
      const result = await this.handleDriverResponse(driverId, tripId, false);
      
      return {
        ...result,
        action: 'timeout',
        message: `Driver timed out. ${result.message}`
      };

    } catch (error) {
      this.logger.error(
        `Error handling driver timeout: driver=${driverId}, trip=${tripId}, error=${error.message}`,
        error.stack
      );

      return {
        success: false,
        action: 'timeout',
        driverId,
        tripId,
        message: `Timeout handling failed: ${error.message}`
      };
    }
  }

  /**
   * Handle global trip timeout (no drivers responded)
   */
  async handleGlobalTripTimeout(tripId: string, originalDriverIds: string[]): Promise<ResponseResult> {
    this.logger.warn(`Handling global timeout for trip ${tripId}`);

    try {
      // 1. Check if trip is still waiting
      const trip = await this.tripService.findById(tripId);
      if (!trip || trip.status !== TripStatus.WAITING_FOR_DRIVER) {
        this.logger.debug(
          `Trip ${tripId} no longer waiting (status: ${trip?.status}), skipping global timeout`
        );
        return {
          success: false,
          action: 'timeout',
          driverId: 'global',
          tripId,
          message: `Trip no longer waiting (status: ${trip?.status})`
        };
      }

      // 2. Clean up all driver queues
      const cleanupStats = await this.performGlobalCleanup(tripId, originalDriverIds);

      // 3. Update trip status
      await this.tripService.updateTripStatus(tripId, TripStatus.DRIVER_NOT_FOUND);

      // 4. Notify customer
      await this.eventService.notifyCustomerDriverNotFound(trip, trip.customer.id);

      this.logger.warn(
        `Global timeout completed for trip ${tripId}. Cleaned up ${cleanupStats.totalCleaned} items`
      );

      return {
        success: true,
        action: 'timeout',
        driverId: 'global',
        tripId,
        message: `No drivers found within timeout period`,
        cleanupStats: {
          removedFromDriver: 0,
          removedFromOthers: cleanupStats.totalCleaned,
          bullJobsRemoved: cleanupStats.bullJobsRemoved
        }
      };

    } catch (error) {
      this.logger.error(
        `Error handling global trip timeout: trip=${tripId}, error=${error.message}`,
        error.stack
      );

      return {
        success: false,
        action: 'timeout',
        driverId: 'global',
        tripId,
        message: `Global timeout handling failed: ${error.message}`
      };
    }
  }

  // Private helper methods

  private async validateDriverResponse(driverId: string, tripId: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // 1. Check if driver is processing this trip
    const currentProcessing = await this.driverTripQueueService.getDriverProcessingTrip(driverId);
    if (currentProcessing !== tripId) {
      return {
        valid: false,
        reason: `Driver not processing trip ${tripId} (current: ${currentProcessing})`
      };
    }

    // 2. Check trip status
    const trip = await this.tripService.findById(tripId);
    if (!trip) {
      return {
        valid: false,
        reason: 'Trip not found'
      };
    }

    if (trip.status !== TripStatus.WAITING_FOR_DRIVER) {
      return {
        valid: false,
        reason: `Trip status is ${trip.status}, not waiting for driver`
      };
    }

    return { valid: true };
  }

  private async handleDriverAccept(driverId: string, tripId: string): Promise<ResponseResult> {
    this.logger.log(`Processing driver accept: driver=${driverId}, trip=${tripId}`);

    try {
      // 1. Remove all trips from driver's queue
      const removedFromDriver = await this.driverTripQueueService.removeAllTripsForDriver(driverId);

      // 2. Remove this trip from all other driver queues
      const removedFromOthers = await this.driverTripQueueService.removeTripFromAllDriverQueues(tripId);

      // 3. Clean up Bull Queue jobs
      const bullJobsResult = await this.tripQueueService.removeJobsByTripId(tripId);
      const bullJobsRemoved = bullJobsResult.totalRemoved;

      // 4. Update driver status to ON_TRIP
      await this.driverStatusService.updateDriverAvailability(
        driverId,
        DriverAvailabilityStatus.ON_TRIP
      );

      // 5. Notify remaining drivers that trip is taken
      const remainingDriverIds = await this.driverTripQueueService.getDriversWithTripInQueue(tripId);
      if (remainingDriverIds.length > 0) {
        const trip = await this.tripService.findById(tripId);
        if (trip) {
          await this.eventService.notifyTripAlreadyTaken(trip, remainingDriverIds);
        }
      }

      this.logger.log(
        `Driver ${driverId} accepted trip ${tripId}. Cleanup: ${removedFromDriver} from driver, ${removedFromOthers} from others, ${bullJobsRemoved} Bull jobs`
      );

      return {
        success: true,
        action: 'accepted',
        driverId,
        tripId,
        message: 'Trip successfully accepted',
        cleanupStats: {
          removedFromDriver,
          removedFromOthers,
          bullJobsRemoved
        }
      };

    } catch (error) {
      this.logger.error(
        `Error in handleDriverAccept: driver=${driverId}, trip=${tripId}, error=${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async handleDriverDecline(driverId: string, tripId: string): Promise<ResponseResult> {
    this.logger.debug(`Processing driver decline: driver=${driverId}, trip=${tripId}`);

    try {
      // 1. Remove only this trip from driver's queue (if still there)
      const removed = await this.driverTripQueueService.removeSpecificTripFromDriver(driverId, tripId);

      // 2. Try to process next trip in driver's queue
      const nextProcessingResult = await this.processNextDriverTrip(driverId);

      this.logger.debug(
        `Driver ${driverId} declined trip ${tripId}. Next processing: ${nextProcessingResult.started ? 'started' : 'none available'}`
      );

      return {
        success: true,
        action: 'declined',
        driverId,
        tripId,
        message: 'Trip declined, processing next trip',
        nextProcessing: nextProcessingResult
      };

    } catch (error) {
      this.logger.error(
        `Error in handleDriverDecline: driver=${driverId}, trip=${tripId}, error=${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async processNextDriverTrip(driverId: string): Promise<{
    started: boolean;
    nextTripId?: string;
  }> {
    try {
      // Check if driver is available for next trip
      const driverStatus = await this.driverStatusService.getDriverAvailability(driverId);
      if (driverStatus !== DriverAvailabilityStatus.AVAILABLE) {
        return { started: false };
      }

      // Get next trip from queue
      const nextTrip = await this.driverTripQueueService.getNextTripForDriver(driverId);
      if (!nextTrip) {
        return { started: false };
      }

      // Start processing next trip (this will be handled by QueueOrchestrator)
      // For now, we just return the info
      return {
        started: true,
        nextTripId: nextTrip.tripId
      };

    } catch (error) {
      this.logger.error(
        `Error processing next trip for driver ${driverId}: ${error.message}`
      );
      return { started: false };
    }
  }

  private async performFallbackCleanup(driverId: string, tripId: string): Promise<void> {
    try {
      // Clear processing status
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);
      
      this.logger.warn(`Performed fallback cleanup for driver ${driverId}, trip ${tripId}`);
    } catch (error) {
      this.logger.error(
        `Fallback cleanup failed for driver ${driverId}, trip ${tripId}: ${error.message}`
      );
    }
  }

  private async performGlobalCleanup(tripId: string, originalDriverIds: string[]): Promise<{
    totalCleaned: number;
    bullJobsRemoved: number;
  }> {
    try {
      // 1. Remove trip from all driver queues
      const removedFromQueues = await this.driverTripQueueService.removeTripFromAllDriverQueues(tripId);

      // 2. Clear any processing statuses for this trip
      let processingsCleared = 0;
      for (const driverId of originalDriverIds) {
        const currentProcessing = await this.driverTripQueueService.getDriverProcessingTrip(driverId);
        if (currentProcessing === tripId) {
          await this.driverTripQueueService.clearDriverProcessingTrip(driverId);
          processingsCleared++;
        }
      }

      // 3. Remove Bull Queue jobs
      const bullJobsResult = await this.tripQueueService.removeJobsByTripId(tripId);

      this.logger.debug(
        `Global cleanup for trip ${tripId}: ${removedFromQueues} from queues, ${processingsCleared} processings cleared, ${bullJobsResult.totalRemoved} Bull jobs removed`
      );

      return {
        totalCleaned: removedFromQueues + processingsCleared,
        bullJobsRemoved: bullJobsResult.totalRemoved
      };

    } catch (error) {
      this.logger.error(
        `Error in global cleanup for trip ${tripId}: ${error.message}`
      );
      return {
        totalCleaned: 0,
        bullJobsRemoved: 0
      };
    }
  }
}
