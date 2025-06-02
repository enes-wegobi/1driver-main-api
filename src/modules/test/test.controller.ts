import { Controller, Post, Get } from '@nestjs/common';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { DriverStatusTest } from '../../test-driver-status';
import { QueueTestService } from '../trip/services/queue-test.service';
import { QueueFullCleanupService } from '../../redis/services/queue-full-cleanup.service';

@Controller('test')
export class TestController {
  private driverStatusTest: DriverStatusTest;

  constructor(
    private readonly driverStatusService: DriverStatusService,
    private readonly queueTestService: QueueTestService,
    private readonly queueFullCleanupService: QueueFullCleanupService,
  ) {
    this.driverStatusTest = new DriverStatusTest(driverStatusService);
  }

  @Post('driver-status-flow')
  async testDriverStatusFlow() {
    try {
      await this.driverStatusTest.testDriverStatusFlow();
      return {
        success: true,
        message: 'Driver status flow test completed successfully. Check console logs for details.'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Driver status flow test failed',
        error: error.message
      };
    }
  }

  @Post('queue-system')
  async testQueueSystem() {
    try {
      const result = await this.queueTestService.testQueueSystem();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Queue system test failed',
        error: error.message
      };
    }
  }

  @Post('multi-driver-queue')
  async testMultiDriverQueue() {
    try {
      const result = await this.queueTestService.testMultiDriverQueue();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Multi-driver queue test failed',
        error: error.message
      };
    }
  }

  @Get('queue-statistics')
  async getQueueStatistics() {
    try {
      const stats = await this.queueTestService.getQueueStatistics();
      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get queue statistics',
        error: error.message
      };
    }
  }

  // Queue cleanup endpoints
  @Post('clear-all-queues')
  async clearAllQueues() {
    try {
      await this.queueFullCleanupService.clearAllQueues();
      return {
        success: true,
        message: 'All queues cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear queues',
        error: error.message
      };
    }
  }

  @Post('clear-all-active-trips')
  async clearAllActiveTrips() {
    try {
      await this.queueFullCleanupService.clearAllActiveTrips();
      return {
        success: true,
        message: 'All active trips cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear active trips',
        error: error.message
      };
    }
  }

  @Post('clear-all-driver-data')
  async clearAllDriverData() {
    try {
      await this.queueFullCleanupService.clearAllDriverData();
      return {
        success: true,
        message: 'All driver data cleared successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear driver data',
        error: error.message
      };
    }
  }

  @Post('clear-everything')
  async clearEverything() {
    try {
      await this.queueFullCleanupService.clearEverything();
      return {
        success: true,
        message: 'All Redis data cleared successfully - System reset!'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to clear all data',
        error: error.message
      };
    }
  }

  @Get('cleanup-statistics')
  async getCleanupStatistics() {
    try {
      const stats = await this.queueFullCleanupService.getCleanupStatistics();
      return {
        success: true,
        statistics: stats
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get cleanup statistics',
        error: error.message
      };
    }
  }

  @Post('safe-cleanup')
  async safeCleanup() {
    try {
      await this.queueFullCleanupService.safeCleanup();
      return {
        success: true,
        message: 'Safe cleanup completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to perform safe cleanup',
        error: error.message
      };
    }
  }
}
