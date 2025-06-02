import { Controller, Post, Get } from '@nestjs/common';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { DriverStatusTest } from '../../test-driver-status';
import { QueueTestService } from '../trip/services/queue-test.service';

@Controller('test')
export class TestController {
  private driverStatusTest: DriverStatusTest;

  constructor(
    private readonly driverStatusService: DriverStatusService,
    private readonly queueTestService: QueueTestService,
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
}
