import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

export interface QueuedRequest {
  tripId: string;
  priority: number;
  queuedAt: number;
}

export interface DriverQueueStatus {
  currentRequest: string | null;
  queueLength: number;
  nextRequests: string[];
}

@Injectable()
export class DriverRequestQueueService extends BaseRedisService {
  private readonly serviceLogger = new Logger(DriverRequestQueueService.name);
  private readonly REQUEST_TTL = 1800; // 30 minutes
  private readonly CURRENT_REQUEST_TTL = 300; // 5 minutes

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Set driver's current active request
   */
  @WithErrorHandling()
  async setDriverCurrentRequest(driverId: string, tripId: string): Promise<void> {
    this.serviceLogger.debug(
      `Setting current request for driver ${driverId}: ${tripId}`,
    );
    const key = RedisKeyGenerator.driverCurrentRequest(driverId);
    await this.client.setex(key, this.CURRENT_REQUEST_TTL, tripId);
  }

  /**
   * Get driver's current active request
   */
  @WithErrorHandling(null)
  async getDriverCurrentRequest(driverId: string): Promise<string | null> {
    const key = RedisKeyGenerator.driverCurrentRequest(driverId);
    return await this.client.get(key);
  }

  /**
   * Clear driver's current active request
   */
  @WithErrorHandling()
  async clearDriverCurrentRequest(driverId: string): Promise<void> {
    this.serviceLogger.debug(`Clearing current request for driver ${driverId}`);
    const key = RedisKeyGenerator.driverCurrentRequest(driverId);
    await this.client.del(key);
  }

  /**
   * Add request to driver's queue with priority
   */
  @WithErrorHandling()
  async addRequestToDriverQueue(
    driverId: string,
    tripId: string,
    priority: number = 2,
  ): Promise<void> {
    this.serviceLogger.debug(
      `Adding request ${tripId} to driver ${driverId} queue with priority ${priority}`,
    );

    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    const tripQueueKey = RedisKeyGenerator.tripQueuedDrivers(tripId);

    // Priority + timestamp score (lower priority number = higher priority)
    const score = priority * 1000000 + Date.now();

    await this.client.multi()
      .zadd(queueKey, score, tripId)
      .sadd(tripQueueKey, driverId)
      .expire(queueKey, this.REQUEST_TTL)
      .expire(tripQueueKey, this.REQUEST_TTL)
      .exec();
  }

  /**
   * Get next request from driver's queue
   */
  @WithErrorHandling(null)
  async getNextRequestForDriver(driverId: string): Promise<string | null> {
    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    const results = await this.client.zrange(queueKey, 0, 0);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Remove specific request from driver's queue
   */
  @WithErrorHandling()
  async removeRequestFromDriverQueue(
    driverId: string,
    tripId: string,
  ): Promise<void> {
    this.serviceLogger.debug(
      `Removing request ${tripId} from driver ${driverId} queue`,
    );
    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    await this.client.zrem(queueKey, tripId);
  }

  /**
   * Remove request from all driver queues
   */
  @WithErrorHandling()
  async removeRequestFromAllQueues(tripId: string): Promise<void> {
    this.serviceLogger.debug(
      `Removing request ${tripId} from all driver queues`,
    );

    const tripQueueKey = RedisKeyGenerator.tripQueuedDrivers(tripId);
    const driverIds = await this.client.smembers(tripQueueKey);

    if (driverIds.length > 0) {
      const pipeline = this.client.multi();

      driverIds.forEach((driverId) => {
        const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
        pipeline.zrem(queueKey, tripId);
      });

      pipeline.del(tripQueueKey);
      await pipeline.exec();

      this.serviceLogger.debug(
        `Removed request ${tripId} from ${driverIds.length} driver queues`,
      );
    }
  }

  /**
   * Get driver's queue status
   */
  @WithErrorHandling({
    currentRequest: null,
    queueLength: 0,
    nextRequests: [],
  })
  async getDriverQueueStatus(driverId: string): Promise<DriverQueueStatus> {
    const currentRequest = await this.getDriverCurrentRequest(driverId);
    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    const queueLength = await this.client.zcard(queueKey);
    const nextRequests = await this.client.zrange(queueKey, 0, 2);

    return {
      currentRequest,
      queueLength,
      nextRequests,
    };
  }

  /**
   * Clear all requests from driver's queue
   */
  @WithErrorHandling()
  async clearDriverQueue(driverId: string): Promise<void> {
    this.serviceLogger.debug(`Clearing all requests from driver ${driverId} queue`);
    
    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    const currentRequestKey = RedisKeyGenerator.driverCurrentRequest(driverId);
    
    await this.client.multi()
      .del(queueKey)
      .del(currentRequestKey)
      .exec();
  }

  /**
   * Check if driver has any pending requests (current + queued)
   */
  @WithErrorHandling(false)
  async hasDriverPendingRequests(driverId: string): Promise<boolean> {
    const currentRequest = await this.getDriverCurrentRequest(driverId);
    if (currentRequest) return true;

    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    const queueLength = await this.client.zcard(queueKey);
    return queueLength > 0;
  }

  /**
   * Get all drivers who have this trip in their queue
   */
  @WithErrorHandling([])
  async getDriversWithTripInQueue(tripId: string): Promise<string[]> {
    const tripQueueKey = RedisKeyGenerator.tripQueuedDrivers(tripId);
    return await this.client.smembers(tripQueueKey);
  }

  /**
   * Get queue statistics for monitoring
   */
  @WithErrorHandling({
    totalActiveRequests: 0,
    totalQueuedRequests: 0,
    driversWithActiveRequests: 0,
    driversWithQueuedRequests: 0,
  })
  async getQueueStatistics(): Promise<{
    totalActiveRequests: number;
    totalQueuedRequests: number;
    driversWithActiveRequests: number;
    driversWithQueuedRequests: number;
  }> {
    // This would require scanning Redis keys, implement if needed for monitoring
    // For now, return empty stats
    return {
      totalActiveRequests: 0,
      totalQueuedRequests: 0,
      driversWithActiveRequests: 0,
      driversWithQueuedRequests: 0,
    };
  }
}
