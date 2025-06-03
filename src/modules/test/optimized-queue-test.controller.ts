import { Controller, Get, Post } from '@nestjs/common';
import { QueueOrchestrator } from '../../queue/services/queue-orchestrator.service';
import { ResponseHandler } from '../../queue/services/response-handler.service';
import { EnhancedDriverRequestProcessor } from '../../queue/services/enhanced-driver-request-processor.service';
import { QueuePerformanceMonitor } from '../../queue/services/queue-performance-monitor.service';

@Controller('test/optimized-queue')
export class OptimizedQueueTestController {
  constructor(
    private readonly queueOrchestrator: QueueOrchestrator,
    private readonly responseHandler: ResponseHandler,
    private readonly enhancedProcessor: EnhancedDriverRequestProcessor,
    private readonly performanceMonitor: QueuePerformanceMonitor,
  ) {}

  /**
   * Test orchestrated driver request with auto values
   */
  @Post('request-drivers')
  async testRequestDrivers() {
    const tripId = `test-trip-${Date.now()}`;
    const driverIds = ['driver-1', 'driver-2', 'driver-3', 'driver-4', 'driver-5'];
    const customerLocation = { lat: 25.2048, lon: 55.2708 }; // Dubai
    
    const results = await this.queueOrchestrator.requestDriversForTrip(
      tripId,
      driverIds,
      customerLocation,
      { priority: 2, timeoutSeconds: 120 }
    );

    return {
      success: true,
      message: `Orchestrated driver requests for trip ${tripId}`,
      tripId,
      driverCount: driverIds.length,
      results
    };
  }

  /**
   * Test driver accept response
   */
  @Post('driver-accept')
  async testDriverAccept() {
    const driverId = 'test-driver-1';
    const tripId = `test-trip-${Date.now()}`;
    
    const result = await this.responseHandler.handleDriverResponse(
      driverId,
      tripId,
      true // accepted
    );

    return {
      success: true,
      message: `Driver ${driverId} accepted trip ${tripId}`,
      result
    };
  }

  /**
   * Test driver decline response
   */
  @Post('driver-decline')
  async testDriverDecline() {
    const driverId = 'test-driver-2';
    const tripId = `test-trip-${Date.now()}`;
    
    const result = await this.responseHandler.handleDriverResponse(
      driverId,
      tripId,
      false // declined
    );

    return {
      success: true,
      message: `Driver ${driverId} declined trip ${tripId}`,
      result
    };
  }

  /**
   * Test driver timeout
   */
  @Post('driver-timeout')
  async testDriverTimeout() {
    const driverId = 'test-driver-3';
    const tripId = `test-trip-${Date.now()}`;
    
    const result = await this.responseHandler.handleDriverTimeout(driverId, tripId);

    return {
      success: true,
      message: `Driver ${driverId} timed out for trip ${tripId}`,
      result
    };
  }

  /**
   * Test enhanced driver processing
   */
  @Post('process-driver')
  async testProcessDriver() {
    const driverId = 'test-driver-4';
    
    const result = await this.enhancedProcessor.processNextDriverRequest(driverId);

    return {
      success: true,
      message: `Processed next request for driver ${driverId}`,
      result
    };
  }

  /**
   * Test batch driver processing
   */
  @Post('process-batch')
  async testBatchProcessing() {
    const driverIds = ['driver-1', 'driver-2', 'driver-3', 'driver-4', 'driver-5'];
    
    const result = await this.enhancedProcessor.processBatchDriverRequests(driverIds);

    return {
      success: true,
      message: `Batch processed ${driverIds.length} drivers`,
      result
    };
  }

  /**
   * Test retry mechanism
   */
  @Post('retry-driver')
  async testRetryDriver() {
    const driverId = 'test-driver-5';
    
    const result = await this.enhancedProcessor.retryFailedProcessing(driverId, 3, 1000);

    return {
      success: true,
      message: `Retry processing completed for driver ${driverId}`,
      result
    };
  }

  /**
   * Get system health report
   */
  @Get('health')
  async getSystemHealth() {
    const healthReport = await this.performanceMonitor.getSystemHealth();

    return {
      success: true,
      message: 'System health report generated',
      status: healthReport.status,
      alertCount: healthReport.alerts.length,
      recommendationCount: healthReport.recommendations.length,
      health: healthReport
    };
  }

  /**
   * Get processing statistics
   */
  @Get('stats')
  async getProcessingStats() {
    const stats = await this.enhancedProcessor.getProcessingStats();

    return {
      success: true,
      message: 'Processing statistics retrieved',
      stats
    };
  }

  /**
   * Test global trip timeout
   */
  @Post('global-timeout')
  async testGlobalTimeout() {
    const tripId = `test-trip-${Date.now()}`;
    const originalDriverIds = ['driver-1', 'driver-2', 'driver-3'];
    
    const result = await this.responseHandler.handleGlobalTripTimeout(
      tripId,
      originalDriverIds
    );

    return {
      success: true,
      message: `Processed global timeout for trip ${tripId}`,
      result
    };
  }

  /**
   * Simulate load test with auto values
   */
  @Post('load-test')
  async simulateLoadTest() {
    const numberOfTrips = 10;
    const driversPerTrip = 5;
    const concurrency = 3;
    
    const results: any[] = [];
    const trips = Array.from({ length: numberOfTrips }, (_, i) => ({
      tripId: `load-test-trip-${i + 1}`,
      driverIds: Array.from({ length: driversPerTrip }, (_, j) => `load-driver-${i * driversPerTrip + j + 1}`),
      customerLocation: {
        lat: 25.2048 + (Math.random() - 0.5) * 0.1,
        lon: 55.2708 + (Math.random() - 0.5) * 0.1
      }
    }));

    const startTime = Date.now();

    // Process trips in batches
    for (let i = 0; i < trips.length; i += concurrency) {
      const batch = trips.slice(i, i + concurrency);
      const batchPromises = batch.map(trip =>
        this.queueOrchestrator.requestDriversForTrip(
          trip.tripId,
          trip.driverIds,
          trip.customerLocation,
          { priority: 2, timeoutSeconds: 60 }
        ).catch(error => ({
          tripId: trip.tripId,
          error: error.message,
          success: false
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => 
      Array.isArray(r) ? r.some(item => item.success) : r.success
    ).length;

    return {
      success: true,
      message: `Load test completed`,
      summary: {
        totalTrips: numberOfTrips,
        driversPerTrip,
        concurrency,
        duration: `${duration}ms`,
        successfulTrips: successCount,
        failedTrips: numberOfTrips - successCount,
        throughput: `${(numberOfTrips / (duration / 1000)).toFixed(2)} trips/second`
      }
    };
  }

  /**
   * Test high priority scenario
   */
  @Post('test-high-priority')
  async testHighPriority() {
    const tripId = `priority-trip-${Date.now()}`;
    const driverIds = ['priority-driver-1', 'priority-driver-2', 'priority-driver-3'];
    const customerLocation = { lat: 25.2048, lon: 55.2708 };
    
    const results = await this.queueOrchestrator.requestDriversForTrip(
      tripId,
      driverIds,
      customerLocation,
      { priority: 1, timeoutSeconds: 180, retryOnFailure: true }
    );

    return {
      success: true,
      message: `High priority test completed for trip ${tripId}`,
      scenario: 'high-priority',
      results
    };
  }

  /**
   * Test quick timeout scenario
   */
  @Post('test-quick-timeout')
  async testQuickTimeout() {
    const tripId = `quick-trip-${Date.now()}`;
    const driverIds = ['quick-driver-1', 'quick-driver-2'];
    const customerLocation = { lat: 25.2048, lon: 55.2708 };
    
    const results = await this.queueOrchestrator.requestDriversForTrip(
      tripId,
      driverIds,
      customerLocation,
      { priority: 2, timeoutSeconds: 30, retryOnFailure: false }
    );

    return {
      success: true,
      message: `Quick timeout test completed for trip ${tripId}`,
      scenario: 'quick-timeout',
      results
    };
  }

  /**
   * Reset performance history
   */
  @Post('reset-history')
  async resetPerformanceHistory() {
    this.performanceMonitor.resetPerformanceHistory();

    return {
      success: true,
      message: 'Performance history reset successfully'
    };
  }

  /**
   * Get all system info at once
   */
  @Get('system-overview')
  async getSystemOverview() {
    const [health, stats, trends] = await Promise.all([
      this.performanceMonitor.getSystemHealth(),
      this.enhancedProcessor.getProcessingStats(),
      this.performanceMonitor.getPerformanceTrends()
    ]);

    return {
      success: true,
      message: 'System overview retrieved',
      overview: {
        health: {
          status: health.status,
          alertCount: health.alerts.length,
          recommendationCount: health.recommendations.length
        },
        processing: stats,
        trendsCount: trends.length,
        timestamp: Date.now()
      },
      details: { health, stats, trends }
    };
  }
}
