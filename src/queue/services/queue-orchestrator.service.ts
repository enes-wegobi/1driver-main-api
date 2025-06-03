import { Injectable, Logger } from '@nestjs/common';
import { DriverTripQueueService } from '../../redis/services/driver-trip-queue.service';
import { TripQueueService } from './trip-queue.service';
import { EventService } from '../../modules/event/event.service';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { DriverAvailabilityStatus } from '../../websocket/dto/driver-location.dto';
import { CreateTripRequestJobDto } from '../dto/trip-job.dto';
import { DriverQueueItem } from '../../redis/services/driver-trip-queue.service';

export interface TripRequestOptions {
  priority?: number;
  maxDrivers?: number;
  timeoutSeconds?: number;
  retryOnFailure?: boolean;
}

export interface DriverProcessingResult {
  success: boolean;
  driverId: string;
  tripId: string;
  message?: string;
  nextAction?: 'continue' | 'stop' | 'retry';
}

@Injectable()
export class QueueOrchestrator {
  private readonly logger = new Logger(QueueOrchestrator.name);

  constructor(
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly tripQueueService: TripQueueService,
    private readonly eventService: EventService,
    private readonly driverStatusService: DriverStatusService,
  ) {}

  /**
   * Main orchestration method for requesting drivers for a trip
   */
  async requestDriversForTrip(
    tripId: string,
    driverIds: string[],
    customerLocation: { lat: number; lon: number },
    options: TripRequestOptions = {}
  ): Promise<DriverProcessingResult[]> {
    const {
      priority = 2,
      maxDrivers = driverIds.length,
      timeoutSeconds = 120,
      retryOnFailure = true
    } = options;

    this.logger.log(
      `Starting driver request orchestration for trip ${tripId} with ${driverIds.length} drivers`
    );

    try {
      // 1. Filter and prioritize drivers
      const availableDrivers = await this.filterAndPrioritizeDrivers(
        driverIds.slice(0, maxDrivers),
        customerLocation
      );

      if (availableDrivers.length === 0) {
        this.logger.warn(`No available drivers found for trip ${tripId}`);
        return [{
          success: false,
          driverId: '',
          tripId,
          message: 'No available drivers found',
          nextAction: 'stop'
        }];
      }

      // 2. Add drivers to Redis queues
      await this.addDriversToRedisQueues(
        tripId,
        availableDrivers,
        customerLocation,
        priority
      );

      // 3. Start initial processing for available drivers
      const processingResults = await this.startInitialProcessing(
        availableDrivers,
        timeoutSeconds
      );

      // 4. Schedule global timeout for the trip
      await this.scheduleGlobalTimeout(tripId, availableDrivers, timeoutSeconds * 2);

      this.logger.log(
        `Successfully orchestrated trip ${tripId} for ${availableDrivers.length} drivers`
      );

      return processingResults;

    } catch (error) {
      this.logger.error(
        `Error orchestrating trip ${tripId}: ${error.message}`,
        error.stack
      );

      return [{
        success: false,
        driverId: '',
        tripId,
        message: `Orchestration failed: ${error.message}`,
        nextAction: retryOnFailure ? 'retry' : 'stop'
      }];
    }
  }

  /**
   * Process next driver request from Redis queue
   */
  async processNextDriverRequest(driverId: string): Promise<DriverProcessingResult> {
    try {
      // 1. Check if driver is already processing
      const isProcessing = await this.driverTripQueueService.isDriverProcessingTrip(driverId);
      if (isProcessing) {
        const currentTrip = await this.driverTripQueueService.getDriverProcessingTrip(driverId);
        this.logger.debug(
          `Driver ${driverId} already processing trip ${currentTrip}, skipping`
        );
        return {
          success: false,
          driverId,
          tripId: currentTrip || '',
          message: 'Driver already processing a trip',
          nextAction: 'continue'
        };
      }

      // 2. Get next trip from Redis queue
      const nextTrip = await this.driverTripQueueService.popNextTripForDriver(driverId);
      if (!nextTrip) {
        this.logger.debug(`No trips in queue for driver ${driverId}`);
        return {
          success: false,
          driverId,
          tripId: '',
          message: 'No trips in queue',
          nextAction: 'continue'
        };
      }

      // 3. Validate driver is still available
      const driverStatus = await this.driverStatusService.getDriverAvailability(driverId);
      if (driverStatus !== DriverAvailabilityStatus.AVAILABLE) {
        this.logger.debug(
          `Driver ${driverId} not available (status: ${driverStatus}), skipping trip ${nextTrip.tripId}`
        );
        
        // Put trip back to queue or handle appropriately
        await this.handleUnavailableDriver(driverId, nextTrip);
        
        return {
          success: false,
          driverId,
          tripId: nextTrip.tripId,
          message: `Driver not available (status: ${driverStatus})`,
          nextAction: 'continue'
        };
      }

      // 4. Set processing flag
      await this.driverTripQueueService.setDriverProcessingTrip(
        driverId,
        nextTrip.tripId,
        120 // 2 minutes timeout
      );

      // 5. Create Bull Queue job
      await this.createBullQueueJob(driverId, nextTrip);

      this.logger.debug(
        `Successfully started processing trip ${nextTrip.tripId} for driver ${driverId}`
      );

      return {
        success: true,
        driverId,
        tripId: nextTrip.tripId,
        message: 'Trip processing started',
        nextAction: 'continue'
      };

    } catch (error) {
      this.logger.error(
        `Error processing next request for driver ${driverId}: ${error.message}`,
        error.stack
      );

      // Clear processing status on error
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);

      return {
        success: false,
        driverId,
        tripId: '',
        message: `Processing failed: ${error.message}`,
        nextAction: 'retry'
      };
    }
  }

  /**
   * Handle driver response (accept/decline)
   */
  async handleDriverResponse(
    driverId: string,
    tripId: string,
    accepted: boolean
  ): Promise<DriverProcessingResult> {
    try {
      this.logger.log(
        `Handling driver response: driver=${driverId}, trip=${tripId}, accepted=${accepted}`
      );

      // 1. Clear processing status
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);

      if (accepted) {
        return await this.handleDriverAccept(driverId, tripId);
      } else {
        return await this.handleDriverDecline(driverId, tripId);
      }

    } catch (error) {
      this.logger.error(
        `Error handling driver response: driver=${driverId}, trip=${tripId}, error=${error.message}`,
        error.stack
      );

      // Fallback: clear processing status
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);

      return {
        success: false,
        driverId,
        tripId,
        message: `Response handling failed: ${error.message}`,
        nextAction: 'retry'
      };
    }
  }

  /**
   * Handle driver timeout
   */
  async handleDriverTimeout(driverId: string, tripId: string): Promise<DriverProcessingResult> {
    try {
      // Check if driver is still processing this trip
      const currentProcessing = await this.driverTripQueueService.getDriverProcessingTrip(driverId);
      
      if (currentProcessing !== tripId) {
        this.logger.debug(
          `Driver ${driverId} not processing trip ${tripId} (current: ${currentProcessing}), skipping timeout`
        );
        return {
          success: false,
          driverId,
          tripId,
          message: 'Driver not processing this trip',
          nextAction: 'continue'
        };
      }

      this.logger.log(`Handling timeout for driver ${driverId}, trip ${tripId}`);

      // Handle as decline
      return await this.handleDriverResponse(driverId, tripId, false);

    } catch (error) {
      this.logger.error(
        `Error handling driver timeout: driver=${driverId}, trip=${tripId}, error=${error.message}`,
        error.stack
      );

      return {
        success: false,
        driverId,
        tripId,
        message: `Timeout handling failed: ${error.message}`,
        nextAction: 'continue'
      };
    }
  }

  // Private helper methods

  private async filterAndPrioritizeDrivers(
    driverIds: string[],
    customerLocation: { lat: number; lon: number }
  ): Promise<string[]> {
    // Check driver availability status
    const availabilityChecks = await Promise.all(
      driverIds.map(async (driverId) => {
        const status = await this.driverStatusService.getDriverAvailability(driverId);
        return {
          driverId,
          isAvailable: status === DriverAvailabilityStatus.AVAILABLE
        };
      })
    );

    const availableDrivers = availabilityChecks
      .filter(check => check.isAvailable)
      .map(check => check.driverId);

    this.logger.debug(
      `Filtered ${availableDrivers.length} available drivers from ${driverIds.length} total`
    );

    // TODO: Add distance-based prioritization here if needed
    return availableDrivers;
  }

  private async addDriversToRedisQueues(
    tripId: string,
    driverIds: string[],
    customerLocation: { lat: number; lon: number },
    priority: number
  ): Promise<void> {
    // Add to all driver queues in parallel
    await Promise.all(
      driverIds.map(driverId =>
        this.driverTripQueueService.addTripToDriverQueue(
          driverId,
          tripId,
          priority,
          customerLocation
        )
      )
    );

    this.logger.debug(
      `Added trip ${tripId} to ${driverIds.length} driver queues with priority ${priority}`
    );
  }

  private async startInitialProcessing(
    driverIds: string[],
    timeoutSeconds: number
  ): Promise<DriverProcessingResult[]> {
    // Start processing for all available drivers
    const results = await Promise.allSettled(
      driverIds.map(driverId => this.processNextDriverRequest(driverId))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          driverId: driverIds[index],
          tripId: '',
          message: `Failed to start processing: ${result.reason}`,
          nextAction: 'retry' as const
        };
      }
    });
  }

  private async createBullQueueJob(driverId: string, tripData: DriverQueueItem): Promise<void> {
    const jobData: CreateTripRequestJobDto = {
      tripId: tripData.tripId,
      driverId,
      priority: tripData.priority,
      customerLocation: tripData.customerLocation,
      tripData: {
        customerId: '', // Will be filled by processor
      },
      retryCount: 0,
      originalDriverIds: []
    };

    await this.tripQueueService.addTripRequest(jobData, {
      attempts: 1, // Single attempt for sequential processing
      removeOnComplete: 10,
      removeOnFail: 10,
      priority: tripData.priority
    });

    this.logger.debug(
      `Created Bull Queue job for trip ${tripData.tripId}, driver ${driverId}`
    );
  }

  private async handleDriverAccept(driverId: string, tripId: string): Promise<DriverProcessingResult> {
    // 1. Remove all trips from driver's queue
    const removedFromDriver = await this.driverTripQueueService.removeAllTripsForDriver(driverId);

    // 2. Remove this trip from all other driver queues
    const removedFromOthers = await this.driverTripQueueService.removeTripFromAllDriverQueues(tripId);

    // 3. Clean up Bull Queue jobs
    await this.tripQueueService.removeJobsByTripId(tripId);

    this.logger.log(
      `Driver ${driverId} accepted trip ${tripId}. Removed ${removedFromDriver} from driver queue, ${removedFromOthers} from other queues`
    );

    return {
      success: true,
      driverId,
      tripId,
      message: `Trip accepted. Cleaned up ${removedFromDriver + removedFromOthers} pending requests`,
      nextAction: 'stop'
    };
  }

  private async handleDriverDecline(driverId: string, tripId: string): Promise<DriverProcessingResult> {
    // 1. Remove only this trip from driver's queue (already popped)
    await this.driverTripQueueService.removeSpecificTripFromDriver(driverId, tripId);

    // 2. Process next trip in driver's queue
    const nextResult = await this.processNextDriverRequest(driverId);

    this.logger.debug(
      `Driver ${driverId} declined trip ${tripId}, next processing result: ${nextResult.success}`
    );

    return {
      success: true,
      driverId,
      tripId,
      message: `Trip declined. Next trip processing: ${nextResult.success ? 'started' : 'none available'}`,
      nextAction: 'continue'
    };
  }

  private async handleUnavailableDriver(driverId: string, tripData: DriverQueueItem): Promise<void> {
    // Put the trip back to the driver's queue or handle appropriately
    // For now, we'll just log it - in production you might want to:
    // 1. Put it back to queue with lower priority
    // 2. Move to another driver's queue
    // 3. Mark driver as temporarily unavailable
    
    this.logger.warn(
      `Driver ${driverId} unavailable for trip ${tripData.tripId}, trip will be skipped`
    );
  }

  private async scheduleGlobalTimeout(
    tripId: string,
    driverIds: string[],
    timeoutSeconds: number
  ): Promise<void> {
    // Schedule a global timeout job
    await this.tripQueueService.addTimeoutJob({
      tripId,
      driverId: 'global', // Special marker for global timeout
      timeoutType: 'global_trip_timeout',
      scheduledAt: new Date(Date.now() + timeoutSeconds * 1000),
      metadata: {
        originalDriverIds: driverIds,
        customerLocation: { lat: 0, lon: 0 }, // Will be filled from trip data
        retryCount: 0
      }
    });

    this.logger.debug(
      `Scheduled global timeout for trip ${tripId} in ${timeoutSeconds} seconds`
    );
  }
}
