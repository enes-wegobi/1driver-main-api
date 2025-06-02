import { Injectable, Logger } from '@nestjs/common';
import { QueueStatusService } from '../../redis/services/queue-status.service';
import {
  QueueOverviewDto,
  DetailedDriverQueueDto,
  TripQueueStatusDto,
  QueuePerformanceMetricsDto,
  QueueHealthCheckDto,
  RealtimeQueueStatsDto,
} from './dto/queue-overview.dto';

@Injectable()
export class QueueMonitoringService {
  private readonly logger = new Logger(QueueMonitoringService.name);

  constructor(private readonly queueStatusService: QueueStatusService) {}

  /**
   * Get system queue overview
   */
  async getSystemOverview(): Promise<QueueOverviewDto> {
    this.logger.debug('Getting system queue overview');
    return await this.queueStatusService.getSystemQueueOverview();
  }

  /**
   * Get detailed queue information for a specific driver
   */
  async getDriverQueueDetails(driverId: string): Promise<DetailedDriverQueueDto> {
    this.logger.debug(`Getting queue details for driver ${driverId}`);
    return await this.queueStatusService.getDriverQueueDetails(driverId);
  }

  /**
   * Get all active queues
   */
  async getAllActiveQueues(): Promise<DetailedDriverQueueDto[]> {
    this.logger.debug('Getting all active queues');
    return await this.queueStatusService.getAllActiveQueues();
  }

  /**
   * Get queue status for a specific trip
   */
  async getTripQueueStatus(tripId: string): Promise<TripQueueStatusDto> {
    this.logger.debug(`Getting queue status for trip ${tripId}`);
    return await this.queueStatusService.getTripQueueStatus(tripId);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<QueuePerformanceMetricsDto> {
    this.logger.debug('Getting queue performance metrics');
    return await this.queueStatusService.getQueuePerformanceMetrics();
  }

  /**
   * Get health check
   */
  async getHealthCheck(): Promise<QueueHealthCheckDto> {
    this.logger.debug('Performing queue health check');
    return await this.queueStatusService.getQueueHealthCheck();
  }

  /**
   * Get real-time queue statistics
   */
  async getRealtimeStats(): Promise<RealtimeQueueStatsDto> {
    this.logger.debug('Getting real-time queue statistics');
    return await this.queueStatusService.getRealtimeQueueStats();
  }

  /**
   * Get queue summary for dashboard
   */
  async getQueueSummary(): Promise<{
    overview: QueueOverviewDto;
    health: QueueHealthCheckDto;
    topQueues: DetailedDriverQueueDto[];
  }> {
    this.logger.debug('Getting queue summary for dashboard');

    const [overview, health, allQueues] = await Promise.all([
      this.getSystemOverview(),
      this.getHealthCheck(),
      this.getAllActiveQueues(),
    ]);

    // Get top 10 queues by length
    const topQueues = allQueues.slice(0, 10);

    return {
      overview,
      health,
      topQueues,
    };
  }

  /**
   * Get queue statistics by time range (placeholder for future implementation)
   */
  async getQueueStatsByTimeRange(
    startTime: Date,
    endTime: Date,
  ): Promise<{
    averageQueueLength: number;
    peakQueueLength: number;
    totalRequestsProcessed: number;
    averageWaitTime: number;
  }> {
    this.logger.debug(`Getting queue stats for time range ${startTime} to ${endTime}`);
    
    // This would require historical data tracking
    // For now, return current metrics
    const metrics = await this.getPerformanceMetrics();
    
    return {
      averageQueueLength: 0, // Would need historical tracking
      peakQueueLength: 0, // Would need historical tracking
      totalRequestsProcessed: metrics.totalRequests,
      averageWaitTime: metrics.averageWaitTime,
    };
  }

  /**
   * Get driver performance statistics
   */
  async getDriverPerformanceStats(driverId: string): Promise<{
    currentQueueLength: number;
    averageResponseTime: number;
    totalRequestsHandled: number;
    lastActiveTime: Date | null;
    performanceRating: 'excellent' | 'good' | 'average' | 'poor';
  }> {
    this.logger.debug(`Getting performance stats for driver ${driverId}`);

    const driverQueue = await this.getDriverQueueDetails(driverId);
    
    // Calculate performance rating based on queue length and activity
    let performanceRating: 'excellent' | 'good' | 'average' | 'poor' = 'average';
    if (driverQueue.queueLength === 0 && driverQueue.isActive) {
      performanceRating = 'excellent';
    } else if (driverQueue.queueLength <= 2 && driverQueue.isActive) {
      performanceRating = 'good';
    } else if (driverQueue.queueLength > 5 || !driverQueue.isActive) {
      performanceRating = 'poor';
    }

    return {
      currentQueueLength: driverQueue.queueLength,
      averageResponseTime: 0, // Would need historical tracking
      totalRequestsHandled: 0, // Would need historical tracking
      lastActiveTime: driverQueue.lastActivity,
      performanceRating,
    };
  }
}
