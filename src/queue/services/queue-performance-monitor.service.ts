import { Injectable, Logger } from '@nestjs/common';
import { DriverTripQueueService } from '../../redis/services/driver-trip-queue.service';
import { TripQueueService } from './trip-queue.service';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

export interface QueueHealthReport {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: number;
  redis: RedisQueueStats;
  bull: BullQueueStats[];
  performance: PerformanceMetrics;
  alerts: HealthAlert[];
  recommendations: string[];
}

export interface RedisQueueStats {
  totalActiveDrivers: number;
  totalQueuedTrips: number;
  processingDrivers: number;
  averageQueueLength: number;
  longestQueue: {
    driverId: string;
    length: number;
  };
  oldestTrip: {
    tripId: string;
    age: number;
  } | null;
  queueDetails: DriverQueueDetail[];
}

export interface DriverQueueDetail {
  driverId: string;
  queueLength: number;
  isProcessing: boolean;
  processingTrip?: string;
  oldestTripAge?: number;
}

export interface BullQueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  processingRate: number; // jobs per minute
}

export interface PerformanceMetrics {
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  throughput: number; // trips per minute
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  memoryUsage: {
    redis: number;
    application: number;
  };
}

export interface HealthAlert {
  level: 'info' | 'warning' | 'critical';
  type: 'queue_length' | 'processing_time' | 'error_rate' | 'memory' | 'timeout';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

@Injectable()
export class QueuePerformanceMonitor {
  private readonly logger = new Logger(QueuePerformanceMonitor.name);
  private readonly performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 100;
  
  // Thresholds for alerts
  private readonly thresholds = {
    maxQueueLength: 50,
    maxProcessingTime: 30000, // 30 seconds
    maxErrorRate: 0.05, // 5%
    maxAverageQueueLength: 10,
    maxTripAge: 600000, // 10 minutes
    minSuccessRate: 0.95, // 95%
  };

  constructor(
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly tripQueueService: TripQueueService,
    private readonly driverStatusService: DriverStatusService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get comprehensive system health report
   */
  async getSystemHealth(): Promise<QueueHealthReport> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Generating system health report...');

      // Gather all statistics in parallel
      const [redisStats, bullStats, performanceMetrics] = await Promise.all([
        this.getRedisQueueStats(),
        this.getBullQueueStats(),
        this.calculatePerformanceMetrics(),
      ]);

      // Generate alerts based on current stats
      const alerts = this.generateHealthAlerts(redisStats, bullStats, performanceMetrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(redisStats, bullStats, performanceMetrics);

      // Determine overall health status
      const status = this.calculateOverallHealth(alerts);

      const report: QueueHealthReport = {
        status,
        timestamp: Date.now(),
        redis: redisStats,
        bull: bullStats,
        performance: performanceMetrics,
        alerts,
        recommendations
      };

      // Store performance metrics for trending
      this.storePerformanceMetrics(performanceMetrics);

      const duration = Date.now() - startTime;
      this.logger.debug(`Health report generated in ${duration}ms with status: ${status}`);

      return report;

    } catch (error) {
      this.logger.error(`Error generating health report: ${error.message}`, error.stack);
      
      return {
        status: 'critical',
        timestamp: Date.now(),
        redis: this.getEmptyRedisStats(),
        bull: [],
        performance: this.getEmptyPerformanceMetrics(),
        alerts: [{
          level: 'critical',
          type: 'queue_length',
          message: `Health check failed: ${error.message}`,
          value: 0,
          threshold: 0,
          timestamp: Date.now()
        }],
        recommendations: ['Fix health monitoring system']
      };
    }
  }

  /**
   * Get detailed Redis queue statistics
   */
  async getRedisQueueStats(): Promise<RedisQueueStats> {
    try {
      // Get all active drivers
      const activeDrivers = await this.driverStatusService.getActiveDrivers();
      
      if (activeDrivers.length === 0) {
        return {
          totalActiveDrivers: 0,
          totalQueuedTrips: 0,
          processingDrivers: 0,
          averageQueueLength: 0,
          longestQueue: { driverId: '', length: 0 },
          oldestTrip: null,
          queueDetails: []
        };
      }

      // Get detailed queue information for each driver
      const queueDetails = await Promise.all(
        activeDrivers.map(async (driverId): Promise<DriverQueueDetail> => {
          const [queueLength, isProcessing, processingTrip, queueStatus] = await Promise.all([
            this.driverTripQueueService.getDriverQueueLength(driverId),
            this.driverTripQueueService.isDriverProcessingTrip(driverId),
            this.driverTripQueueService.getDriverProcessingTrip(driverId),
            this.driverTripQueueService.getDriverQueueStatus(driverId)
          ]);

          // Calculate oldest trip age
          let oldestTripAge: number | undefined;
          if (queueStatus.nextTrips.length > 0) {
            const oldestTrip = queueStatus.nextTrips[queueStatus.nextTrips.length - 1];
            oldestTripAge = Date.now() - oldestTrip.addedAt;
          }

          return {
            driverId,
            queueLength,
            isProcessing,
            processingTrip: processingTrip || undefined,
            oldestTripAge
          };
        })
      );

      // Calculate aggregated statistics
      const totalQueuedTrips = queueDetails.reduce((sum, detail) => sum + detail.queueLength, 0);
      const processingDrivers = queueDetails.filter(detail => detail.isProcessing).length;
      const driversWithQueues = queueDetails.filter(detail => detail.queueLength > 0);
      const averageQueueLength = driversWithQueues.length > 0 
        ? totalQueuedTrips / driversWithQueues.length 
        : 0;

      // Find longest queue
      const longestQueue = queueDetails.reduce(
        (longest, current) => current.queueLength > longest.length 
          ? { driverId: current.driverId, length: current.queueLength }
          : longest,
        { driverId: '', length: 0 }
      );

      // Find oldest trip
      const oldestTrip = queueDetails
        .filter(detail => detail.oldestTripAge !== undefined)
        .reduce<{ tripId: string; age: number } | null>(
          (oldest, current) => {
            if (!current.oldestTripAge) return oldest;
            if (!oldest || current.oldestTripAge > oldest.age) {
              return { tripId: `${current.driverId}-oldest`, age: current.oldestTripAge };
            }
            return oldest;
          },
          null
        );

      return {
        totalActiveDrivers: activeDrivers.length,
        totalQueuedTrips,
        processingDrivers,
        averageQueueLength: Math.round(averageQueueLength * 100) / 100,
        longestQueue,
        oldestTrip,
        queueDetails
      };

    } catch (error) {
      this.logger.error(`Error getting Redis queue stats: ${error.message}`);
      return this.getEmptyRedisStats();
    }
  }

  /**
   * Get Bull Queue statistics
   */
  async getBullQueueStats(): Promise<BullQueueStats[]> {
    try {
      const queueStats = await this.tripQueueService.getQueueStats();
      
      return queueStats.map(stat => ({
        queueName: stat.queueName,
        waiting: stat.waiting,
        active: stat.active,
        completed: stat.completed,
        failed: stat.failed,
        delayed: stat.delayed,
        paused: false, // TODO: Get actual paused status
        processingRate: this.calculateProcessingRate(stat.completed) // Simplified calculation
      }));

    } catch (error) {
      this.logger.error(`Error getting Bull queue stats: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate performance metrics
   */
  async calculatePerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Get recent performance data (simplified for now)
      const recentMetrics = this.performanceHistory.slice(-10);
      
      if (recentMetrics.length === 0) {
        return this.getEmptyPerformanceMetrics();
      }

      // Calculate averages
      const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.averageProcessingTime, 0) / recentMetrics.length;
      const successRate = recentMetrics.reduce((sum, m) => sum + m.successRate, 0) / recentMetrics.length;
      const errorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
      const throughput = recentMetrics.reduce((sum, m) => sum + m.throughput, 0) / recentMetrics.length;

      // Get memory usage
      const memoryUsage = process.memoryUsage();

      return {
        averageProcessingTime: Math.round(averageProcessingTime),
        successRate: Math.round(successRate * 10000) / 10000,
        errorRate: Math.round(errorRate * 10000) / 10000,
        throughput: Math.round(throughput * 100) / 100,
        responseTime: {
          p50: Math.round(averageProcessingTime * 0.8),
          p95: Math.round(averageProcessingTime * 1.5),
          p99: Math.round(averageProcessingTime * 2.0)
        },
        memoryUsage: {
          redis: 0, // TODO: Get actual Redis memory usage
          application: Math.round(memoryUsage.heapUsed / 1024 / 1024) // MB
        }
      };

    } catch (error) {
      this.logger.error(`Error calculating performance metrics: ${error.message}`);
      return this.getEmptyPerformanceMetrics();
    }
  }

  /**
   * Generate health alerts based on current statistics
   */
  private generateHealthAlerts(
    redisStats: RedisQueueStats,
    bullStats: BullQueueStats[],
    performance: PerformanceMetrics
  ): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const now = Date.now();

    // Check queue length alerts
    if (redisStats.longestQueue.length > this.thresholds.maxQueueLength) {
      alerts.push({
        level: 'warning',
        type: 'queue_length',
        message: `Driver ${redisStats.longestQueue.driverId} has ${redisStats.longestQueue.length} trips in queue`,
        value: redisStats.longestQueue.length,
        threshold: this.thresholds.maxQueueLength,
        timestamp: now
      });
    }

    // Check average queue length
    if (redisStats.averageQueueLength > this.thresholds.maxAverageQueueLength) {
      alerts.push({
        level: 'warning',
        type: 'queue_length',
        message: `Average queue length is ${redisStats.averageQueueLength}`,
        value: redisStats.averageQueueLength,
        threshold: this.thresholds.maxAverageQueueLength,
        timestamp: now
      });
    }

    // Check oldest trip age
    if (redisStats.oldestTrip && redisStats.oldestTrip.age > this.thresholds.maxTripAge) {
      alerts.push({
        level: 'critical',
        type: 'timeout',
        message: `Oldest trip is ${Math.round(redisStats.oldestTrip.age / 1000)}s old`,
        value: redisStats.oldestTrip.age,
        threshold: this.thresholds.maxTripAge,
        timestamp: now
      });
    }

    // Check processing time
    if (performance.averageProcessingTime > this.thresholds.maxProcessingTime) {
      alerts.push({
        level: 'warning',
        type: 'processing_time',
        message: `Average processing time is ${performance.averageProcessingTime}ms`,
        value: performance.averageProcessingTime,
        threshold: this.thresholds.maxProcessingTime,
        timestamp: now
      });
    }

    // Check error rate
    if (performance.errorRate > this.thresholds.maxErrorRate) {
      alerts.push({
        level: 'critical',
        type: 'error_rate',
        message: `Error rate is ${(performance.errorRate * 100).toFixed(2)}%`,
        value: performance.errorRate,
        threshold: this.thresholds.maxErrorRate,
        timestamp: now
      });
    }

    // Check success rate
    if (performance.successRate < this.thresholds.minSuccessRate) {
      alerts.push({
        level: 'critical',
        type: 'error_rate',
        message: `Success rate is ${(performance.successRate * 100).toFixed(2)}%`,
        value: performance.successRate,
        threshold: this.thresholds.minSuccessRate,
        timestamp: now
      });
    }

    // Check Bull Queue specific alerts
    bullStats.forEach(stat => {
      if (stat.failed > stat.completed * 0.1) { // More than 10% failure rate
        alerts.push({
          level: 'warning',
          type: 'error_rate',
          message: `${stat.queueName} has high failure rate: ${stat.failed} failed vs ${stat.completed} completed`,
          value: stat.failed / (stat.completed + stat.failed),
          threshold: 0.1,
          timestamp: now
        });
      }
    });

    return alerts;
  }

  /**
   * Generate recommendations based on current state
   */
  private generateRecommendations(
    redisStats: RedisQueueStats,
    bullStats: BullQueueStats[],
    performance: PerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Queue length recommendations
    if (redisStats.averageQueueLength > 5) {
      recommendations.push('Consider increasing driver pool or optimizing driver matching algorithm');
    }

    if (redisStats.totalQueuedTrips > redisStats.totalActiveDrivers * 3) {
      recommendations.push('Driver demand is high - consider surge pricing or driver incentives');
    }

    // Performance recommendations
    if (performance.averageProcessingTime > 10000) {
      recommendations.push('Processing time is high - review database queries and Redis operations');
    }

    if (performance.errorRate > 0.02) {
      recommendations.push('Error rate is elevated - check logs for common failure patterns');
    }

    // Bull Queue recommendations
    const totalWaiting = bullStats.reduce((sum, stat) => sum + stat.waiting, 0);
    if (totalWaiting > 100) {
      recommendations.push('High number of waiting jobs - consider scaling workers or optimizing job processing');
    }

    // Memory recommendations
    if (performance.memoryUsage.application > 512) {
      recommendations.push('High memory usage detected - consider memory optimization or scaling');
    }

    // No issues found
    if (recommendations.length === 0) {
      recommendations.push('System is performing well - no immediate action required');
    }

    return recommendations;
  }

  /**
   * Calculate overall health status
   */
  private calculateOverallHealth(alerts: HealthAlert[]): 'healthy' | 'warning' | 'critical' {
    const criticalAlerts = alerts.filter(alert => alert.level === 'critical');
    const warningAlerts = alerts.filter(alert => alert.level === 'warning');

    if (criticalAlerts.length > 0) {
      return 'critical';
    } else if (warningAlerts.length > 2) {
      return 'critical';
    } else if (warningAlerts.length > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Store performance metrics for historical analysis
   */
  private storePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push({
      ...metrics,
      // Add timestamp for trending
    });

    // Keep only recent history
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Calculate processing rate (simplified)
   */
  private calculateProcessingRate(completedJobs: number): number {
    // Simplified calculation - in production, you'd track this over time
    return Math.round(completedJobs / 60 * 100) / 100; // jobs per minute
  }

  // Helper methods for empty states

  private getEmptyRedisStats(): RedisQueueStats {
    return {
      totalActiveDrivers: 0,
      totalQueuedTrips: 0,
      processingDrivers: 0,
      averageQueueLength: 0,
      longestQueue: { driverId: '', length: 0 },
      oldestTrip: null,
      queueDetails: []
    };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      averageProcessingTime: 0,
      successRate: 1,
      errorRate: 0,
      throughput: 0,
      responseTime: { p50: 0, p95: 0, p99: 0 },
      memoryUsage: { redis: 0, application: 0 }
    };
  }

  /**
   * Get performance trends for dashboard
   */
  getPerformanceTrends(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Reset performance history (for testing)
   */
  resetPerformanceHistory(): void {
    this.performanceHistory.length = 0;
  }
}
