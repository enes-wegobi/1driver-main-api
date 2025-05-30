import { Controller, Post } from '@nestjs/common';
import { DriverStatusService } from '../../redis/services/driver-status.service';
import { DriverStatusTest } from '../../test-driver-status';

@Controller('test')
export class TestController {
  private driverStatusTest: DriverStatusTest;

  constructor(private readonly driverStatusService: DriverStatusService) {
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
}
