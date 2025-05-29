import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DriverStatusService } from './driver-status.service';

@Injectable()
export class DriverCleanupService {
  private readonly logger = new Logger(DriverCleanupService.name);

  constructor(private readonly driverStatusService: DriverStatusService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleDriverCleanup() {
    this.logger.log('Starting driver cleanup job...');
    
    try {
      const cleanedDrivers = await this.driverStatusService.cleanupStaleDrivers();
      
      if (cleanedDrivers.length > 0) {
        this.logger.log(`Cleaned up ${cleanedDrivers.length} stale drivers: ${cleanedDrivers.join(', ')}`);
      } else {
        this.logger.debug('No stale drivers found to clean up');
      }
    } catch (error) {
      this.logger.error(`Error during driver cleanup: ${error.message}`, error.stack);
    }
  }

  // Manual cleanup method for testing or admin purposes
  async manualCleanup(): Promise<string[]> {
    this.logger.log('Manual driver cleanup initiated');
    
    try {
      const cleanedDrivers = await this.driverStatusService.cleanupStaleDrivers();
      this.logger.log(`Manual cleanup completed. Cleaned ${cleanedDrivers.length} drivers`);
      return cleanedDrivers;
    } catch (error) {
      this.logger.error(`Error during manual cleanup: ${error.message}`, error.stack);
      throw error;
    }
  }
}
