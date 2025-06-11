import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DriverStatusService } from 'src/redis/services/driver-status.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly driverStatusService: DriverStatusService) {}

  @Cron('*/2 * * * *')
  async cleanupExpiredHeartbeats() {
    this.logger.log('Starting expired heartbeat cleanup...');

    try {
      // Driver cleanup
      const cleanedDrivers =
        await this.driverStatusService.cleanupStaleDrivers();

      if (cleanedDrivers.length > 0) {
        this.logger.log(
          `Cleaned up ${cleanedDrivers.length} drivers with expired heartbeats: ${cleanedDrivers.join(', ')}`,
        );
      }

      // Customer cleanup (if you have similar logic)
      // const cleanedCustomers = await this.customerStatusService.cleanupStaleCustomers();

      this.logger.log('Expired heartbeat cleanup completed successfully');
    } catch (error) {
      this.logger.error(`Error during heartbeat cleanup: ${error.message}`);
    }
  }

  @Cron('*/5 * * * *')
  async comprehensiveCleanup() {
    this.logger.log('Starting comprehensive cleanup...');

    try {
      const cleanupResult =
        await this.driverStatusService.cleanupStaleDriversAdvanced();

      if (cleanupResult.heartbeatExpired.length > 0) {
        this.logger.log(
          `Drivers disconnected due to heartbeat timeout: ${cleanupResult.heartbeatExpired.join(', ')}`,
        );
      }

      if (cleanupResult.availabilityChanged.length > 0) {
        this.logger.log(
          `Drivers changed to BUSY due to inactivity: ${cleanupResult.availabilityChanged.join(', ')}`,
        );
      }

      // Log current status summary
      const statusSummary =
        await this.driverStatusService.getDriverStatusSummary();
      this.logger.log(
        `Current driver status: ${statusSummary.connectedDrivers} connected, ` +
          `${statusSummary.availableDrivers} available, ${statusSummary.onTripDrivers} on trip, ` +
          `${statusSummary.busyDrivers} busy`,
      );

      this.logger.log('Comprehensive cleanup completed successfully');
    } catch (error) {
      this.logger.error(`Error during comprehensive cleanup: ${error.message}`);
    }
  }

  // Günde bir kez genel sistem temizliği
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async dailyMaintenance() {
    this.logger.log('Starting daily maintenance...');

    try {
      // Expired location data cleanup
      // Expired token cleanup
      // Database sync if needed
      // Metrics aggregation

      this.logger.log('Daily maintenance completed successfully');
    } catch (error) {
      this.logger.error(`Error during daily maintenance: ${error.message}`);
    }
  }

  // Manual cleanup endpoint (optional)
  async forceCleanup(): Promise<{
    cleanedDrivers: string[];
    statusSummary: any;
  }> {
    this.logger.log('Manual cleanup triggered...');

    const cleanedDrivers = await this.driverStatusService.cleanupStaleDrivers();
    const statusSummary =
      await this.driverStatusService.getDriverStatusSummary();

    this.logger.log(
      `Manual cleanup completed. Cleaned ${cleanedDrivers.length} drivers`,
    );

    return { cleanedDrivers, statusSummary };
  }
}
