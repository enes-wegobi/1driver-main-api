import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QueueMonitoringService } from './queue-monitoring.service';
import {
  QueueOverviewDto,
  DetailedDriverQueueDto,
  TripQueueStatusDto,
  QueuePerformanceMetricsDto,
  QueueHealthCheckDto,
  RealtimeQueueStatsDto,
} from './dto/queue-overview.dto';

@ApiTags('Queue Monitoring')
@Controller('queue-status')
export class QueueMonitoringController {
  constructor(private readonly queueMonitoringService: QueueMonitoringService) {}

  /**
   * Get system queue overview
   * GET /queue-status/overview
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get system queue overview' })
  @ApiResponse({ status: 200, description: 'System queue overview retrieved successfully' })
  async getSystemOverview(): Promise<{
    success: boolean;
    data: QueueOverviewDto | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getSystemOverview();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get system overview: ${error.message}`,
      };
    }
  }

  /**
   * Get detailed queue information for a specific driver
   * GET /queue-status/driver/:driverId
   */
  @Get('driver/:driverId')
  @ApiOperation({ summary: 'Get detailed queue information for a specific driver' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiResponse({ status: 200, description: 'Driver queue details retrieved successfully' })
  async getDriverQueueDetails(
    @Param('driverId') driverId: string,
  ): Promise<{
    success: boolean;
    data: DetailedDriverQueueDto | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getDriverQueueDetails(driverId);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get queue details for driver ${driverId}: ${error.message}`,
      };
    }
  }

  /**
   * Get all active queues
   * GET /queue-status/all-queues
   */
  @Get('all-queues')
  @ApiOperation({ summary: 'Get all active queues' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of results' })
  @ApiResponse({ status: 200, description: 'Active queues retrieved successfully' })
  async getAllActiveQueues(
    @Query('limit') limit?: string,
  ): Promise<{
    success: boolean;
    data: DetailedDriverQueueDto[];
    total: number;
    message?: string;
  }> {
    try {
      const allQueues = await this.queueMonitoringService.getAllActiveQueues();
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      const data = limitNum ? allQueues.slice(0, limitNum) : allQueues;
      
      return {
        success: true,
        data,
        total: allQueues.length,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        message: `Failed to get active queues: ${error.message}`,
      };
    }
  }

  /**
   * Get queue status for a specific trip
   * GET /queue-status/trip/:tripId
   */
  @Get('trip/:tripId')
  @ApiOperation({ summary: 'Get queue status for a specific trip' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip queue status retrieved successfully' })
  async getTripQueueStatus(
    @Param('tripId') tripId: string,
  ): Promise<{
    success: boolean;
    data: TripQueueStatusDto | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getTripQueueStatus(tripId);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get queue status for trip ${tripId}: ${error.message}`,
      };
    }
  }

  /**
   * Get performance metrics
   * GET /queue-status/metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get queue performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics(): Promise<{
    success: boolean;
    data: QueuePerformanceMetricsDto | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getPerformanceMetrics();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get performance metrics: ${error.message}`,
      };
    }
  }

  /**
   * Get health check
   * GET /queue-status/health
   */
  @Get('health')
  @ApiOperation({ summary: 'Get queue system health check' })
  @ApiResponse({ status: 200, description: 'Health check completed successfully' })
  async getHealthCheck(): Promise<{
    success: boolean;
    data: QueueHealthCheckDto | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getHealthCheck();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get health check: ${error.message}`,
      };
    }
  }

  /**
   * Get real-time queue statistics
   * GET /queue-status/realtime
   */
  @Get('realtime')
  @ApiOperation({ summary: 'Get real-time queue statistics' })
  @ApiResponse({ status: 200, description: 'Real-time statistics retrieved successfully' })
  async getRealtimeStats(): Promise<{
    success: boolean;
    data: RealtimeQueueStatsDto | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getRealtimeStats();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get realtime stats: ${error.message}`,
      };
    }
  }

  /**
   * Get queue summary for dashboard
   * GET /queue-status/summary
   */
  @Get('summary')
  @ApiOperation({ summary: 'Get queue summary for dashboard' })
  @ApiResponse({ status: 200, description: 'Queue summary retrieved successfully' })
  async getQueueSummary(): Promise<{
    success: boolean;
    data: {
      overview: QueueOverviewDto;
      health: QueueHealthCheckDto;
      topQueues: DetailedDriverQueueDto[];
    } | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getQueueSummary();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get queue summary: ${error.message}`,
      };
    }
  }

  /**
   * Get driver performance statistics
   * GET /queue-status/driver/:driverId/performance
   */
  @Get('driver/:driverId/performance')
  @ApiOperation({ summary: 'Get driver performance statistics' })
  @ApiParam({ name: 'driverId', description: 'Driver ID' })
  @ApiResponse({ status: 200, description: 'Driver performance stats retrieved successfully' })
  async getDriverPerformanceStats(
    @Param('driverId') driverId: string,
  ): Promise<{
    success: boolean;
    data: {
      currentQueueLength: number;
      averageResponseTime: number;
      totalRequestsHandled: number;
      lastActiveTime: Date | null;
      performanceRating: 'excellent' | 'good' | 'average' | 'poor';
    } | null;
    message?: string;
  }> {
    try {
      const data = await this.queueMonitoringService.getDriverPerformanceStats(driverId);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get performance stats for driver ${driverId}: ${error.message}`,
      };
    }
  }

  /**
   * Get queue statistics by time range
   * GET /queue-status/stats/time-range
   */
  @Get('stats/time-range')
  @ApiOperation({ summary: 'Get queue statistics by time range' })
  @ApiQuery({ name: 'startTime', description: 'Start time (ISO 8601 format)' })
  @ApiQuery({ name: 'endTime', description: 'End time (ISO 8601 format)' })
  @ApiResponse({ status: 200, description: 'Time range statistics retrieved successfully' })
  async getQueueStatsByTimeRange(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ): Promise<{
    success: boolean;
    data: {
      averageQueueLength: number;
      peakQueueLength: number;
      totalRequestsProcessed: number;
      averageWaitTime: number;
    } | null;
    message?: string;
  }> {
    try {
      if (!startTime || !endTime) {
        return {
          success: false,
          data: null,
          message: 'startTime and endTime query parameters are required',
        };
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
          success: false,
          data: null,
          message: 'Invalid date format. Use ISO 8601 format (e.g., 2023-12-01T10:00:00Z)',
        };
      }

      const data = await this.queueMonitoringService.getQueueStatsByTimeRange(start, end);
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get queue stats: ${error.message}`,
      };
    }
  }

  /**
   * Get system status with quick overview
   * GET /queue-status/system-status
   */
  @Get('system-status')
  @ApiOperation({ summary: 'Get system status with quick overview' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  async getSystemStatus(): Promise<{
    success: boolean;
    data: {
      status: 'healthy' | 'warning' | 'critical';
      totalQueues: number;
      totalRequests: number;
      systemLoad: 'low' | 'medium' | 'high';
      timestamp: Date;
    } | null;
    message?: string;
  }> {
    try {
      const [overview, health] = await Promise.all([
        this.queueMonitoringService.getSystemOverview(),
        this.queueMonitoringService.getHealthCheck(),
      ]);

      return {
        success: true,
        data: {
          status: health.status,
          totalQueues: overview.driversWithQueues,
          totalRequests: overview.totalQueuedRequests,
          systemLoad: overview.systemLoad,
          timestamp: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        message: `Failed to get system status: ${error.message}`,
      };
    }
  }
}
