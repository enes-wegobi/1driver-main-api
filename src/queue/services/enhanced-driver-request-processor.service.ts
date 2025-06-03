import { Injectable, Logger } from '@nestjs/common';
import { DriverTripQueueService, DriverQueueItem } from '../../redis/services/driver-trip-queue.service';
import { TripQueueService } from './trip-queue.service';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { TripService } from '../../modules/trip/services/trip.service';
import { EventService } from '../../modules/event/event.service';
import { DriverAvailabilityStatus } from '../../websocket/dto/driver-location.dto';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { CreateTripRequestJobDto } from '../dto/trip-job.dto';

export interface ProcessingResult {
  success: boolean;
  driverId: string;
  tripId?: string;
  action: 'started' | 'skipped' | 'failed' | 'no_trips';
  reason?: string;
  nextAction?: 'continue' | 'stop' | 'retry';
  metrics?: {
    processingTime: number;
    queueLength: number;
    retryCount: number;
  };
}

export interface BatchProcessingResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  results: ProcessingResult[];
  duration: number;
}

@Injectable()
export class EnhancedDriverRequestProcessor {
  private readonly logger = new Logger(EnhancedDriverRequestProcessor.name);
  private readonly processingDrivers = new Set<string>();

  constructor(
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly tripQueueService: TripQueueService,
    private readonly driverStatusService: DriverStatusService,
    private readonly tripService: TripService,
    private readonly eventService: EventService,
  ) {}

  /**
   * Process next driver request from Redis queue with comprehensive validation
   */
  async processNextDriverRequest(driverId: string): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Prevent concurrent processing for same driver
    if (this.processingDrivers.has(driverId)) {
      return {
        success: false,
        driverId,
        action: 'skipped',
        reason: 'Driver already being processed concurrently',
        nextAction: 'continue'
      };
    }

    this.processingDrivers.add(driverId);

    try {
      this.logger.debug(`Starting driver request processing for driver ${driverId}`);

      // 1. Pre-processing validation
      const preValidation = await this.preProcessingValidation(driverId);
      if (!preValidation.valid) {
        return {
          success: false,
          driverId,
          action: 'skipped',
          reason: preValidation.reason,
          nextAction: 'continue',
          metrics: {
            processingTime: Date.now() - startTime,
            queueLength: 0,
            retryCount: 0
          }
        };
      }

      // 2. Get next trip from Redis queue
      const nextTrip = await this.driverTripQueueService.popNextTripForDriver(driverId);
      if (!nextTrip) {
        return {
          success: false,
          driverId,
          action: 'no_trips',
          reason: 'No trips in queue',
          nextAction: 'continue',
          metrics: {
            processingTime: Date.now() - startTime,
            queueLength: 0,
            retryCount: 0
          }
        };
      }

      // 3. Validate trip and driver compatibility
      const compatibility = await this.validateTripDriverCompatibility(driverId, nextTrip);
      if (!compatibility.valid) {
        // Put trip back or handle appropriately
        await this.handleIncompatibleTrip(driverId, nextTrip, compatibility.reason || 'Unknown compatibility issue');
        
        return {
          success: false,
          driverId,
          tripId: nextTrip.tripId,
          action: 'skipped',
          reason: compatibility.reason,
          nextAction: 'continue',
          metrics: {
            processingTime: Date.now() - startTime,
            queueLength: await this.driverTripQueueService.getDriverQueueLength(driverId),
            retryCount: 0
          }
        };
      }

      // 4. Set processing flag with timeout
      await this.driverTripQueueService.setDriverProcessingTrip(
        driverId,
        nextTrip.tripId,
        120 // 2 minutes timeout
      );

      // 5. Create optimized Bull Queue job
      await this.createOptimizedBullQueueJob(driverId, nextTrip);

      // 6. Schedule individual timeout
      await this.scheduleDriverTimeout(driverId, nextTrip.tripId);

      const processingTime = Date.now() - startTime;
      
      this.logger.debug(
        `Successfully started processing trip ${nextTrip.tripId} for driver ${driverId} in ${processingTime}ms`
      );

      return {
        success: true,
        driverId,
        tripId: nextTrip.tripId,
        action: 'started',
        reason: 'Trip processing initiated successfully',
        nextAction: 'continue',
        metrics: {
          processingTime,
          queueLength: await this.driverTripQueueService.getDriverQueueLength(driverId),
          retryCount: 0
        }
      };

    } catch (error) {
      this.logger.error(
        `Error processing driver request for ${driverId}: ${error.message}`,
        error.stack
      );

      // Cleanup on error
      await this.performErrorCleanup(driverId);

      return {
        success: false,
        driverId,
        action: 'failed',
        reason: `Processing failed: ${error.message}`,
        nextAction: 'retry',
        metrics: {
          processingTime: Date.now() - startTime,
          queueLength: 0,
          retryCount: 0
        }
      };

    } finally {
      this.processingDrivers.delete(driverId);
    }
  }

  /**
   * Process multiple drivers in batch with optimized performance
   */
  async processBatchDriverRequests(driverIds: string[]): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const results: ProcessingResult[] = [];

    this.logger.log(`Starting batch processing for ${driverIds.length} drivers`);

    // Process drivers in parallel with concurrency limit
    const concurrencyLimit = 10; // Adjust based on your system capacity
    const chunks = this.chunkArray(driverIds, concurrencyLimit);

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(driverId => this.processNextDriverRequest(driverId))
      );

      // Collect results
      chunkResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            driverId: chunk[index],
            action: 'failed',
            reason: `Batch processing failed: ${result.reason}`,
            nextAction: 'retry'
          });
        }
      });
    }

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success && r.action === 'failed').length;
    const skipped = results.filter(r => !r.success && r.action === 'skipped').length;

    this.logger.log(
      `Batch processing completed in ${duration}ms: ${successful} successful, ${failed} failed, ${skipped} skipped`
    );

    return {
      totalProcessed: results.length,
      successful,
      failed,
      skipped,
      results,
      duration
    };
  }

  /**
   * Smart retry mechanism for failed processing
   */
  async retryFailedProcessing(
    driverId: string,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<ProcessingResult> {
    let lastResult: ProcessingResult | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.debug(`Retry attempt ${attempt}/${maxRetries} for driver ${driverId}`);

      lastResult = await this.processNextDriverRequest(driverId);

      if (lastResult.success) {
        this.logger.log(`Retry successful for driver ${driverId} on attempt ${attempt}`);
        return lastResult;
      }

      // Wait before next retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.logger.warn(`All retry attempts failed for driver ${driverId}`);
    return lastResult || {
      success: false,
      driverId,
      action: 'failed',
      reason: 'All retry attempts exhausted',
      nextAction: 'stop'
    };
  }

  /**
   * Get processing statistics for monitoring
   */
  async getProcessingStats(): Promise<{
    activeProcessing: number;
    queuedDrivers: number;
    averageQueueLength: number;
    totalPendingTrips: number;
  }> {
    try {
      // Get active drivers
      const activeDrivers = await this.driverStatusService.getActiveDrivers();
      
      // Get queue statistics
      const queueStats = await Promise.all(
        activeDrivers.map(async driverId => ({
          driverId,
          queueLength: await this.driverTripQueueService.getDriverQueueLength(driverId),
          isProcessing: await this.driverTripQueueService.isDriverProcessingTrip(driverId)
        }))
      );

      const activeProcessing = queueStats.filter(stat => stat.isProcessing).length;
      const queuedDrivers = queueStats.filter(stat => stat.queueLength > 0).length;
      const totalPendingTrips = queueStats.reduce((sum, stat) => sum + stat.queueLength, 0);
      const averageQueueLength = queuedDrivers > 0 ? totalPendingTrips / queuedDrivers : 0;

      return {
        activeProcessing,
        queuedDrivers,
        averageQueueLength: Math.round(averageQueueLength * 100) / 100,
        totalPendingTrips
      };

    } catch (error) {
      this.logger.error(`Error getting processing stats: ${error.message}`);
      return {
        activeProcessing: 0,
        queuedDrivers: 0,
        averageQueueLength: 0,
        totalPendingTrips: 0
      };
    }
  }

  // Private helper methods

  private async preProcessingValidation(driverId: string): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // 1. Check if driver is already processing
    const isProcessing = await this.driverTripQueueService.isDriverProcessingTrip(driverId);
    if (isProcessing) {
      const currentTrip = await this.driverTripQueueService.getDriverProcessingTrip(driverId);
      return {
        valid: false,
        reason: `Driver already processing trip ${currentTrip}`
      };
    }

    // 2. Check driver availability status
    const driverStatus = await this.driverStatusService.getDriverAvailability(driverId);
    if (driverStatus !== DriverAvailabilityStatus.AVAILABLE) {
      return {
        valid: false,
        reason: `Driver not available (status: ${driverStatus})`
      };
    }

    return { valid: true };
  }

  private async validateTripDriverCompatibility(
    driverId: string,
    tripData: DriverQueueItem
  ): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    try {
      // 1. Check if trip still exists and is valid
      const trip = await this.tripService.findById(tripData.tripId);
      if (!trip) {
        return {
          valid: false,
          reason: 'Trip not found'
        };
      }

      // 2. Check trip status
      if (trip.status !== TripStatus.WAITING_FOR_DRIVER) {
        return {
          valid: false,
          reason: `Trip status is ${trip.status}, not waiting for driver`
        };
      }

      // 3. Check if driver is in the called drivers list
      if (trip.calledDriverIds && !trip.calledDriverIds.includes(driverId)) {
        return {
          valid: false,
          reason: 'Driver not in called drivers list'
        };
      }

      // 4. Check if driver already rejected this trip
      if (trip.rejectedDriverIds && trip.rejectedDriverIds.includes(driverId)) {
        return {
          valid: false,
          reason: 'Driver already rejected this trip'
        };
      }

      // 5. Check trip age (optional - prevent processing very old trips)
      const tripAge = Date.now() - tripData.addedAt;
      const maxTripAge = 10 * 60 * 1000; // 10 minutes
      if (tripAge > maxTripAge) {
        return {
          valid: false,
          reason: `Trip too old (${Math.round(tripAge / 1000)}s)`
        };
      }

      return { valid: true };

    } catch (error) {
      this.logger.error(
        `Error validating trip-driver compatibility: ${error.message}`
      );
      return {
        valid: false,
        reason: `Validation error: ${error.message}`
      };
    }
  }

  private async createOptimizedBullQueueJob(
    driverId: string,
    tripData: DriverQueueItem
  ): Promise<void> {
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

    // Optimized job options for sequential processing
    await this.tripQueueService.addTripRequest(jobData, {
      attempts: 1, // Single attempt for sequential processing
      removeOnComplete: 5, // Keep fewer completed jobs
      removeOnFail: 5, // Keep fewer failed jobs
      priority: tripData.priority,
      delay: 0 // Immediate processing
    });

    this.logger.debug(
      `Created optimized Bull Queue job for trip ${tripData.tripId}, driver ${driverId}`
    );
  }

  private async scheduleDriverTimeout(driverId: string, tripId: string): Promise<void> {
    await this.tripQueueService.addTimeoutJob({
      tripId,
      driverId,
      timeoutType: 'driver_response',
      scheduledAt: new Date(Date.now() + 120000), // 2 minutes
      metadata: {
        customerLocation: { lat: 0, lon: 0 }, // Will be filled from trip data
        originalDriverIds: [],
        retryCount: 0
      }
    });
  }

  private async handleIncompatibleTrip(
    driverId: string,
    tripData: DriverQueueItem,
    reason: string
  ): Promise<void> {
    this.logger.warn(
      `Incompatible trip ${tripData.tripId} for driver ${driverId}: ${reason}`
    );

    // For now, we'll just log it. In production, you might want to:
    // 1. Put trip back to queue with lower priority
    // 2. Move to another driver's queue
    // 3. Mark trip as problematic
    // 4. Update trip status if needed
  }

  private async performErrorCleanup(driverId: string): Promise<void> {
    try {
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);
      this.logger.debug(`Performed error cleanup for driver ${driverId}`);
    } catch (error) {
      this.logger.error(
        `Error cleanup failed for driver ${driverId}: ${error.message}`
      );
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
