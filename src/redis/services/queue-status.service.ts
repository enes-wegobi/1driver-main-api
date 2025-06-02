import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

export interface QueuedRequestDetail {
  tripId: string;
  priority: number;
  queuedAt: Date;
  waitingTime: number; // milliseconds
  score: number;
}

export interface DetailedDriverQueueInfo {
  driverId: string;
  currentRequest: string | null;
  queueLength: number;
  queuedRequests: QueuedRequestDetail[];
  lastActivity: Date | null;
  isActive: boolean;
}

export interface QueueOverviewStats {
  totalActiveDrivers: number;
  totalQueuedRequests: number;
  totalCurrentRequests: number;
  averageQueueLength: number;
  systemLoad: 'low' | 'medium' | 'high';
  driversWithQueues: number;
  longestQueueLength: number;
  oldestQueuedRequest: number | null; // milliseconds
}

export interface TripQueueStatus {
  tripId: string;
  queuedInDrivers: string[];
  totalDriversQueued: number;
  averagePosition: number;
  oldestQueueTime: Date | null;
}

export interface QueuePerformanceMetrics {
  totalQueues: number;
  totalRequests: number;
  averageWaitTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  memoryUsage: {
    queueKeys: number;
    currentRequestKeys: number;
    tripQueueKeys: number;
  };
}

@Injectable()
export class QueueStatusService extends BaseRedisService {
  private readonly serviceLogger = new Logger(QueueStatusService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Get comprehensive system queue overview
   */
  @WithErrorHandling({
    totalActiveDrivers: 0,
    totalQueuedRequests: 0,
    totalCurrentRequests: 0,
    averageQueueLength: 0,
    systemLoad: 'low' as const,
    driversWithQueues: 0,
    longestQueueLength: 0,
    oldestQueuedRequest: null,
  })
  async getSystemQueueOverview(): Promise<QueueOverviewStats> {
    this.serviceLogger.debug('Getting system queue overview');

    // Get all queue-related keys
    const queueKeys = await this.client.keys('driver:request_queue:*');
    const currentRequestKeys = await this.client.keys('driver:current_request:*');
    const activeDriversCount = await this.client.scard('drivers:active');

    let totalQueuedRequests = 0;
    let driversWithQueues = 0;
    let longestQueueLength = 0;
    let oldestQueuedRequest: number | null = null;

    // Analyze each driver's queue
    for (const queueKey of queueKeys) {
      const queueLength = await this.client.zcard(queueKey);
      if (queueLength > 0) {
        driversWithQueues++;
        totalQueuedRequests += queueLength;
        longestQueueLength = Math.max(longestQueueLength, queueLength);

        // Get oldest request in this queue
        const oldestRequests = await this.client.zrange(queueKey, 0, 0, 'WITHSCORES');
        if (oldestRequests.length >= 2) {
          const score = parseFloat(oldestRequests[1]);
          const timestamp = score % 1000000; // Extract timestamp from score
          const waitTime = Date.now() - timestamp;
          if (oldestQueuedRequest === null || waitTime > oldestQueuedRequest) {
            oldestQueuedRequest = waitTime;
          }
        }
      }
    }

    const averageQueueLength = driversWithQueues > 0 ? totalQueuedRequests / driversWithQueues : 0;
    
    // Determine system load
    let systemLoad: 'low' | 'medium' | 'high' = 'low';
    if (averageQueueLength > 5 || totalQueuedRequests > 100) {
      systemLoad = 'high';
    } else if (averageQueueLength > 2 || totalQueuedRequests > 50) {
      systemLoad = 'medium';
    }

    return {
      totalActiveDrivers: activeDriversCount,
      totalQueuedRequests,
      totalCurrentRequests: currentRequestKeys.length,
      averageQueueLength: Math.round(averageQueueLength * 100) / 100,
      systemLoad,
      driversWithQueues,
      longestQueueLength,
      oldestQueuedRequest,
    };
  }

  /**
   * Get detailed queue information for a specific driver
   */
  @WithErrorHandling({
    driverId: '',
    currentRequest: null,
    queueLength: 0,
    queuedRequests: [],
    lastActivity: null,
    isActive: false,
  })
  async getDriverQueueDetails(driverId: string): Promise<DetailedDriverQueueInfo> {
    this.serviceLogger.debug(`Getting queue details for driver ${driverId}`);

    const currentRequestKey = RedisKeyGenerator.driverCurrentRequest(driverId);
    const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
    const activeKey = RedisKeyGenerator.driverActive(driverId);

    const [currentRequest, queueLength, isActive] = await Promise.all([
      this.client.get(currentRequestKey),
      this.client.zcard(queueKey),
      this.client.exists(activeKey),
    ]);

    // Get queued requests with scores
    const queuedRequestsWithScores = await this.client.zrange(queueKey, 0, -1, 'WITHSCORES');
    const queuedRequests: QueuedRequestDetail[] = [];

    for (let i = 0; i < queuedRequestsWithScores.length; i += 2) {
      const tripId = queuedRequestsWithScores[i];
      const score = parseFloat(queuedRequestsWithScores[i + 1]);
      
      // Extract priority and timestamp from score
      const priority = Math.floor(score / 1000000);
      const timestamp = score % 1000000;
      const queuedAt = new Date(timestamp);
      const waitingTime = Date.now() - timestamp;

      queuedRequests.push({
        tripId,
        priority,
        queuedAt,
        waitingTime,
        score,
      });
    }

    // Get last activity (TTL of current request or queue)
    let lastActivity: Date | null = null;
    if (currentRequest) {
      const ttl = await this.client.ttl(currentRequestKey);
      if (ttl > 0) {
        lastActivity = new Date(Date.now() - (300 - ttl) * 1000); // 300 is CURRENT_REQUEST_TTL
      }
    } else if (queueLength > 0) {
      const ttl = await this.client.ttl(queueKey);
      if (ttl > 0) {
        lastActivity = new Date(Date.now() - (1800 - ttl) * 1000); // 1800 is REQUEST_TTL
      }
    }

    return {
      driverId,
      currentRequest,
      queueLength,
      queuedRequests,
      lastActivity,
      isActive: Boolean(isActive),
    };
  }

  /**
   * Get all active queues with basic information
   */
  @WithErrorHandling([])
  async getAllActiveQueues(): Promise<DetailedDriverQueueInfo[]> {
    this.serviceLogger.debug('Getting all active queues');

    const queueKeys = await this.client.keys('driver:request_queue:*');
    const activeQueues: DetailedDriverQueueInfo[] = [];

    for (const queueKey of queueKeys) {
      const driverId = queueKey.split(':')[2]; // Extract driver ID from key
      const queueLength = await this.client.zcard(queueKey);
      
      if (queueLength > 0) {
        const queueDetails = await this.getDriverQueueDetails(driverId);
        activeQueues.push(queueDetails);
      }
    }

    // Sort by queue length (descending)
    return activeQueues.sort((a, b) => b.queueLength - a.queueLength);
  }

  /**
   * Get queue status for a specific trip
   */
  @WithErrorHandling({
    tripId: '',
    queuedInDrivers: [],
    totalDriversQueued: 0,
    averagePosition: 0,
    oldestQueueTime: null,
  })
  async getTripQueueStatus(tripId: string): Promise<TripQueueStatus> {
    this.serviceLogger.debug(`Getting queue status for trip ${tripId}`);

    const tripQueueKey = RedisKeyGenerator.tripQueuedDrivers(tripId);
    const queuedDrivers = await this.client.smembers(tripQueueKey);

    if (queuedDrivers.length === 0) {
      return {
        tripId,
        queuedInDrivers: [],
        totalDriversQueued: 0,
        averagePosition: 0,
        oldestQueueTime: null,
      };
    }

    let totalPosition = 0;
    let oldestQueueTime: Date | null = null;

    // Check position in each driver's queue
    for (const driverId of queuedDrivers) {
      const queueKey = RedisKeyGenerator.driverRequestQueue(driverId);
      const position = await this.client.zrank(queueKey, tripId);
      
      if (position !== null) {
        totalPosition += position + 1; // zrank is 0-based, we want 1-based position

        // Get queue time
        const score = await this.client.zscore(queueKey, tripId);
        if (score !== null) {
          const timestamp = parseFloat(score) % 1000000;
          const queueTime = new Date(timestamp);
          if (oldestQueueTime === null || queueTime < oldestQueueTime) {
            oldestQueueTime = queueTime;
          }
        }
      }
    }

    const averagePosition = queuedDrivers.length > 0 ? totalPosition / queuedDrivers.length : 0;

    return {
      tripId,
      queuedInDrivers: queuedDrivers,
      totalDriversQueued: queuedDrivers.length,
      averagePosition: Math.round(averagePosition * 100) / 100,
      oldestQueueTime,
    };
  }

  /**
   * Get performance metrics for the queue system
   */
  @WithErrorHandling({
    totalQueues: 0,
    totalRequests: 0,
    averageWaitTime: 0,
    systemHealth: 'healthy' as const,
    memoryUsage: {
      queueKeys: 0,
      currentRequestKeys: 0,
      tripQueueKeys: 0,
    },
  })
  async getQueuePerformanceMetrics(): Promise<QueuePerformanceMetrics> {
    this.serviceLogger.debug('Getting queue performance metrics');

    // Get all queue-related keys
    const [queueKeys, currentRequestKeys, tripQueueKeys] = await Promise.all([
      this.client.keys('driver:request_queue:*'),
      this.client.keys('driver:current_request:*'),
      this.client.keys('trip:queued_drivers:*'),
    ]);

    let totalRequests = 0;
    let totalWaitTime = 0;
    let requestCount = 0;

    // Calculate total requests and average wait time
    for (const queueKey of queueKeys) {
      const queueLength = await this.client.zcard(queueKey);
      totalRequests += queueLength;

      if (queueLength > 0) {
        const requestsWithScores = await this.client.zrange(queueKey, 0, -1, 'WITHSCORES');
        for (let i = 1; i < requestsWithScores.length; i += 2) {
          const score = parseFloat(requestsWithScores[i]);
          const timestamp = score % 1000000;
          const waitTime = Date.now() - timestamp;
          totalWaitTime += waitTime;
          requestCount++;
        }
      }
    }

    const averageWaitTime = requestCount > 0 ? totalWaitTime / requestCount : 0;

    // Determine system health
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (averageWaitTime > 300000 || totalRequests > 200) { // 5 minutes or 200+ requests
      systemHealth = 'critical';
    } else if (averageWaitTime > 120000 || totalRequests > 100) { // 2 minutes or 100+ requests
      systemHealth = 'warning';
    }

    return {
      totalQueues: queueKeys.length,
      totalRequests,
      averageWaitTime: Math.round(averageWaitTime),
      systemHealth,
      memoryUsage: {
        queueKeys: queueKeys.length,
        currentRequestKeys: currentRequestKeys.length,
        tripQueueKeys: tripQueueKeys.length,
      },
    };
  }

  /**
   * Perform health check on the queue system
   */
  @WithErrorHandling({
    status: 'unhealthy',
    issues: ['Service unavailable'],
    recommendations: [],
    timestamp: new Date(),
  })
  async getQueueHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    timestamp: Date;
  }> {
    this.serviceLogger.debug('Performing queue health check');

    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      const [overview, metrics] = await Promise.all([
        this.getSystemQueueOverview(),
        this.getQueuePerformanceMetrics(),
      ]);

      // Check for issues
      if (overview.oldestQueuedRequest && overview.oldestQueuedRequest > 600000) { // 10 minutes
        issues.push(`Oldest queued request is ${Math.round(overview.oldestQueuedRequest / 60000)} minutes old`);
        recommendations.push('Consider increasing driver capacity or optimizing queue processing');
      }

      if (overview.longestQueueLength > 10) {
        issues.push(`Longest queue has ${overview.longestQueueLength} requests`);
        recommendations.push('Monitor driver availability and queue distribution');
      }

      if (overview.systemLoad === 'high') {
        issues.push('System load is high');
        recommendations.push('Scale up driver capacity or implement load balancing');
      }

      if (metrics.averageWaitTime > 180000) { // 3 minutes
        issues.push(`Average wait time is ${Math.round(metrics.averageWaitTime / 60000)} minutes`);
        recommendations.push('Optimize queue processing or increase driver response time');
      }

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (issues.length > 2 || metrics.systemHealth === 'critical') {
        status = 'critical';
      } else if (issues.length > 0 || metrics.systemHealth === 'warning') {
        status = 'warning';
      }

      return {
        status,
        issues,
        recommendations,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'critical',
        issues: ['Health check failed', error.message],
        recommendations: ['Check Redis connection and service availability'],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get real-time queue statistics for monitoring dashboard
   */
  @WithErrorHandling({
    overview: null,
    metrics: null,
    topQueues: [],
    recentActivity: [],
  })
  async getRealtimeQueueStats(): Promise<{
    overview: QueueOverviewStats;
    metrics: QueuePerformanceMetrics;
    topQueues: DetailedDriverQueueInfo[];
    recentActivity: Array<{
      type: 'queue_add' | 'queue_remove' | 'current_request';
      driverId: string;
      tripId: string;
      timestamp: Date;
    }>;
  }> {
    const [overview, metrics, allQueues] = await Promise.all([
      this.getSystemQueueOverview(),
      this.getQueuePerformanceMetrics(),
      this.getAllActiveQueues(),
    ]);

    // Get top 5 queues by length
    const topQueues = allQueues.slice(0, 5);

    // Recent activity would need to be tracked separately
    // For now, return empty array
    const recentActivity: Array<{
      type: 'queue_add' | 'queue_remove' | 'current_request';
      driverId: string;
      tripId: string;
      timestamp: Date;
    }> = [];

    return {
      overview,
      metrics,
      topQueues,
      recentActivity,
    };
  }
}
