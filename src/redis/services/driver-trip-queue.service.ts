import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { LoggerService } from 'src/logger/logger.service';

export interface DriverQueueItem {
  tripId: string;
  priority: number;
  addedAt: number;
  customerLocation: {
    lat: number;
    lon: number;
  };
}

export interface DriverQueueStatus {
  queueLength: number;
  currentProcessing: string | null;
  processingStartedAt: number | null;
  nextTrips: DriverQueueItem[];
}

@Injectable()
export class DriverTripQueueService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }
  /**
   * Add a trip to driver's queue with priority
   */
  @WithErrorHandling()
  async addTripToDriverQueue(
    driverId: string,
    tripId: string,
    priority: number,
    customerLocation: { lat: number; lon: number },
  ): Promise<void> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);

    const queueItem: DriverQueueItem = {
      tripId,
      priority,
      addedAt: Date.now(),
      customerLocation,
    };

    // Add to sorted set with priority as score (higher priority = lower score for first processing)
    await this.client.zadd(queueKey, priority, JSON.stringify(queueItem));

    // Set expiry for queue (24 hours)
    await this.client.expire(queueKey, 24 * 60 * 60);
    
    this.customLogger.info(
      `Added trip ${tripId} to driver ${driverId} queue with priority ${priority}`,
    );
     
  }

  /**
   * Get the next trip for driver (highest priority)
   */
  @WithErrorHandling(null)
  async getNextTripForDriver(
    driverId: string,
  ): Promise<DriverQueueItem | null> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);

    // Get the item with lowest score (highest priority)
    const result = await this.client.zrange(queueKey, 0, 0, 'WITHSCORES');

    if (!result || result.length === 0) {
      return null;
    }

    try {
      const queueItem: DriverQueueItem = JSON.parse(result[0]);
      return queueItem;
    } catch (error) {
      this.customLogger.error(
        `Error parsing queue item for driver ${driverId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Remove and get the next trip for driver (pop operation)
   */
  @WithErrorHandling(null)
  async popNextTripForDriver(
    driverId: string,
  ): Promise<DriverQueueItem | null> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);

    // Get and remove the item with lowest score (highest priority)
    const result = await this.client.zpopmin(queueKey, 1);

    if (!result || result.length === 0) {
      return null;
    }

    try {
      const queueItem: DriverQueueItem = JSON.parse(result[0]);

      // Save the popped trip as last request for recovery
      await this.setDriverLastRequest(driverId, queueItem);

      this.customLogger.debug(
        `Popped trip ${queueItem.tripId} from driver ${driverId} queue`,
      );
      return queueItem;
    } catch (error) {
      this.customLogger.error(
        `Error parsing popped queue item for driver ${driverId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Remove all trips from driver's queue
   */
  @WithErrorHandling(0)
  async removeAllTripsForDriver(driverId: string): Promise<number> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);
    const processingKey = RedisKeyGenerator.driverProcessingTrip(driverId);

    const pipeline = this.client.multi();
    pipeline.zcard(queueKey);
    pipeline.del(queueKey);
    pipeline.del(processingKey);

    const results = await pipeline.exec();
    const queueCount = results ? (results[0][1] as number) : 0;

    this.customLogger.debug(
      `Removed ${queueCount} trips from driver ${driverId} queue`,
    );

    return queueCount || 0;
  }

  /**
   * Remove specific trip from driver's queue
   */
  @WithErrorHandling(false)
  async removeSpecificTripFromDriver(
    driverId: string,
    tripId: string,
  ): Promise<boolean> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);

    // Get all items and find the one with matching tripId
    const allItems = await this.client.zrange(queueKey, 0, -1);

    for (const item of allItems) {
      try {
        const queueItem: DriverQueueItem = JSON.parse(item);
        this.customLogger.debug(
          `Queue item for driver ${driverId}: ${JSON.stringify(queueItem, null, 2)}`
        );
        if (queueItem.tripId === tripId) {
          const removed = await this.client.zrem(queueKey, item);
          this.customLogger.debug(
            `Removed trip ${tripId} from driver ${driverId} queue`,
          );
          return removed > 0;
        }
      } catch (error) {
        this.customLogger.error(`Error parsing queue item:`, error);
      }
    }

    return false;
  }

  /**
   * Get driver's queue length
   */
  @WithErrorHandling(0)
  async getDriverQueueLength(driverId: string): Promise<number> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);
    return await this.client.zcard(queueKey);
  }

  /**
   * Check if driver is currently processing a trip
   */
  @WithErrorHandling(false)
  async isDriverProcessingTrip(driverId: string): Promise<boolean> {
    const processingKey = RedisKeyGenerator.driverProcessingTrip(driverId);
    const result = await this.client.get(processingKey);
    return result !== null;
  }

  /**
   * Get the trip driver is currently processing
   */
  @WithErrorHandling(null)
  async getDriverProcessingTrip(driverId: string): Promise<string | null> {
    const processingKey = RedisKeyGenerator.driverProcessingTrip(driverId);
    return await this.client.get(processingKey);
  }

  /**
   * Set driver as processing a specific trip
   */
  @WithErrorHandling()
  async setDriverProcessingTrip(
    driverId: string,
    tripId: string,
    timeoutSeconds: number = 120,
  ): Promise<void> {
    const processingKey = RedisKeyGenerator.driverProcessingTrip(driverId);

    await this.client.setex(processingKey, timeoutSeconds, tripId);

    this.customLogger.debug(
      `Set driver ${driverId} as processing trip ${tripId} with ${timeoutSeconds}s timeout`,
    );
  }

  /**
   * Clear driver's processing trip
   */
  @WithErrorHandling()
  async clearDriverProcessingTrip(driverId: string): Promise<void> {
    const processingKey = RedisKeyGenerator.driverProcessingTrip(driverId);
    await this.client.del(processingKey);

    this.customLogger.debug(`Cleared processing trip for driver ${driverId}`);
  }

  /**
   * Get complete driver queue status
   */
  @WithErrorHandling({
    queueLength: 0,
    currentProcessing: null,
    processingStartedAt: null,
    nextTrips: [],
  })
  async getDriverQueueStatus(driverId: string): Promise<DriverQueueStatus> {
    const queueKey = RedisKeyGenerator.driverTripQueue(driverId);
    const processingKey = RedisKeyGenerator.driverProcessingTrip(driverId);

    const pipeline = this.client.multi();
    pipeline.zrange(queueKey, 0, -1, 'WITHSCORES');
    pipeline.get(processingKey);

    const results = await pipeline.exec();

    if (!results) {
      return {
        queueLength: 0,
        currentProcessing: null,
        processingStartedAt: null,
        nextTrips: [],
      };
    }

    const queueItems = results[0][1] as string[];
    const currentProcessing = results[1][1] as string | null;

    const nextTrips: DriverQueueItem[] = [];

    // Parse queue items
    for (let i = 0; i < queueItems.length; i += 2) {
      try {
        const queueItem: DriverQueueItem = JSON.parse(queueItems[i]);
        nextTrips.push(queueItem);
      } catch (error) {
        this.customLogger.error(`Error parsing queue item:`, error);
      }
    }

    // Get processing start time if exists
    let processingStartedAt: number | null = null;
    if (currentProcessing) {
      const ttl = await this.client.ttl(processingKey);
      if (ttl > 0) {
        processingStartedAt = Date.now() - (120 - ttl) * 1000; // Assuming 120s timeout
      }
    }

    return {
      queueLength: nextTrips.length,
      currentProcessing,
      processingStartedAt,
      nextTrips,
    };
  }

  /**
   * Get all drivers with pending trips for a specific trip
   */
  @WithErrorHandling([])
  async getDriversWithTripInQueue(tripId: string): Promise<string[]> {
    // This is a more expensive operation, use sparingly
    const pattern = RedisKeyGenerator.driverTripQueue('*');
    const keys = await this.client.keys(pattern);

    const driversWithTrip: string[] = [];

    for (const key of keys) {
      const items = await this.client.zrange(key, 0, -1);

      for (const item of items) {
        try {
          const queueItem: DriverQueueItem = JSON.parse(item);
          if (queueItem.tripId === tripId) {
            // Extract driver ID from key: driver:{driverId}:trip-queue
            const driverId = key.split(':')[1];
            driversWithTrip.push(driverId);
            break;
          }
        } catch (error) {
          this.customLogger.error(`Error parsing queue item:`, error);
        }
      }
    }

    return driversWithTrip;
  }

  /**
   * Remove a specific trip from all driver queues
   */
  @WithErrorHandling(0)
  async removeTripFromAllDriverQueues(tripId: string): Promise<number> {
    const driversWithTrip = await this.getDriversWithTripInQueue(tripId);
    let totalRemoved = 0;

    for (const driverId of driversWithTrip) {
      const removed = await this.removeSpecificTripFromDriver(driverId, tripId);
      if (removed) {
        totalRemoved++;
      }
    }

    this.customLogger.debug(
      `Removed trip ${tripId} from ${totalRemoved} driver queues`,
    );

    return totalRemoved;
  }

  /**
   * Remove a specific trip from all driver queues and return affected drivers
   */
  @WithErrorHandling({ removedCount: 0, affectedDrivers: [] })
  async removeTripFromAllDriverQueuesWithAffectedDrivers(tripId: string): Promise<{
    removedCount: number;
    affectedDrivers: string[];
  }> {
    const driversWithTrip = await this.getDriversWithTripInQueue(tripId);
    let totalRemoved = 0;
    const affectedDrivers: string[] = [];

    for (const driverId of driversWithTrip) {
      const removed = await this.removeSpecificTripFromDriver(driverId, tripId);
      if (removed) {
        totalRemoved++;
        affectedDrivers.push(driverId);
      }
    }

    this.customLogger.debug(
      `Removed trip ${tripId} from ${totalRemoved} driver queues, affected drivers: ${affectedDrivers.join(', ')}`,
    );

    return {
      removedCount: totalRemoved,
      affectedDrivers,
    };
  }

  /**
   * Clean up expired processing trips (for maintenance)
   */
  @WithErrorHandling(0)
  async cleanupExpiredProcessingTrips(): Promise<number> {
    const pattern = RedisKeyGenerator.driverProcessingTrip('*');
    const keys = await this.client.keys(pattern);

    let cleanedCount = 0;

    for (const key of keys) {
      const ttl = await this.client.ttl(key);
      if (ttl === -1) {
        // Key exists but has no expiry
        await this.client.del(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.customLogger.info(
        `Cleaned up ${cleanedCount} expired processing trips`,
      );
    }

    return cleanedCount;
  }

  /**
   * Set driver's last trip request for recovery
   */
  @WithErrorHandling()
  async setDriverLastRequest(
    driverId: string,
    queueItem: DriverQueueItem,
  ): Promise<void> {
    const lastRequestKey = RedisKeyGenerator.driverLastRequest(driverId);

    // Store with 3 minutes TTL
    await this.client.setex(lastRequestKey, 180, JSON.stringify(queueItem));

    this.customLogger.debug(
      `Saved last request for driver ${driverId}: trip ${queueItem.tripId}`,
    );
  }

  /**
   * Get driver's last trip request
   */
  @WithErrorHandling(null)
  async getDriverLastRequest(
    driverId: string,
  ): Promise<DriverQueueItem | null> {
    const lastRequestKey = RedisKeyGenerator.driverLastRequest(driverId);
    const result = await this.client.get(lastRequestKey);

    if (!result) {
      return null;
    }

    try {
      const queueItem: DriverQueueItem = JSON.parse(result);
      this.customLogger.debug(
        `Retrieved last request for driver ${driverId}: trip ${queueItem.tripId}`,
      );
      return queueItem;
    } catch (error) {
      this.customLogger.error(
        `Error parsing last request for driver ${driverId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Clear driver's last trip request
   */
  @WithErrorHandling()
  async clearDriverLastRequest(driverId: string): Promise<void> {
    const lastRequestKey = RedisKeyGenerator.driverLastRequest(driverId);
    await this.client.del(lastRequestKey);

    this.customLogger.debug(`Cleared last request for driver ${driverId}`);
  }
}
