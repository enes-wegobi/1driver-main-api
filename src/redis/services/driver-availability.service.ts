import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';
import { LoggerService } from '../../logger/logger.service';
import { UserType } from 'src/common/user-type.enum';
import { UnifiedUserStatusService } from './unified-user-status.service';

@Injectable()
export class DriverAvailabilityService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
    private readonly unifiedUserStatusService: UnifiedUserStatusService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Update driver availability status
   */
  @WithErrorHandling()
  async updateDriverAvailability(
    driverId: string,
    status: DriverAvailabilityStatus,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.driverAvailability(driverId);
    
    const pipeline = this.client.multi();
    pipeline.set(key, status);
    pipeline.expire(key, this.ACTIVE_DRIVER_EXPIRY);

    await pipeline.exec();

    // Also update location data with availability status
    const locationKey = RedisKeyGenerator.userLocation(driverId);
    const locationData = await this.client.get(locationKey);

    if (locationData) {
      const parsedData = JSON.parse(locationData);
      parsedData.availabilityStatus = status;

      const locationPipeline = this.client.multi();
      locationPipeline.set(locationKey, JSON.stringify(parsedData));
      locationPipeline.expire(locationKey, this.DRIVER_LOCATION_EXPIRY);

      await locationPipeline.exec();
    }

    this.customLogger.info(
      `Driver ${driverId} availability updated to ${status}`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        action: 'update_availability',
        newStatus: status,
      },
    );

    return true;
  }

  /**
   * Get driver availability status
   */
  @WithErrorHandling(DriverAvailabilityStatus.BUSY)
  async getDriverAvailability(
    driverId: string,
  ): Promise<DriverAvailabilityStatus> {
    const key = RedisKeyGenerator.driverAvailability(driverId);
    const status = await this.client.get(key);

    return (
      (status as DriverAvailabilityStatus) || DriverAvailabilityStatus.BUSY
    );
  }

  /**
   * Delete driver availability status
   */
  @WithErrorHandling()
  async deleteDriverAvailability(driverId: string): Promise<boolean> {
    const key = RedisKeyGenerator.driverAvailability(driverId);
    
    const pipeline = this.client.multi();
    pipeline.del(key);

    // Also remove availability status from location data
    const locationKey = RedisKeyGenerator.userLocation(driverId);
    const locationData = await this.client.get(locationKey);

    if (locationData) {
      const parsedData = JSON.parse(locationData);
      delete parsedData.availabilityStatus;

      pipeline.set(locationKey, JSON.stringify(parsedData));
      pipeline.expire(locationKey, this.DRIVER_LOCATION_EXPIRY);
    }

    await pipeline.exec();

    this.customLogger.info(
      `Driver ${driverId} availability status deleted`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        action: 'delete_availability',
      },
    );

    return true;
  }

  /**
   * Check if driver can be assigned a trip
   */
  @WithErrorHandling(false)
  async canAssignTripToDriver(driverId: string): Promise<boolean> {
    // Check availability status
    const availability = await this.getDriverAvailability(driverId);
    if (availability !== DriverAvailabilityStatus.AVAILABLE) {
      return false;
    }

    // Check if driver is actively connected via unified service
    const isActive = await this.unifiedUserStatusService.isUserActive(
      driverId,
      UserType.DRIVER,
    );
    if (!isActive) {
      return false;
    }

    return true;
  }

  /**
   * Check if driver can change availability status
   */
  @WithErrorHandling({ canChange: false, reason: 'Unknown error' })
  async canChangeAvailability(
    driverId: string,
    newStatus: DriverAvailabilityStatus,
  ): Promise<{ canChange: boolean; reason?: string }> {
    const currentStatus = await this.getDriverAvailability(driverId);

    if (currentStatus === DriverAvailabilityStatus.ON_TRIP) {
      return {
        canChange: false,
        reason:
          'Cannot change availability while on trip. Status is controlled by trip system.',
      };
    }

    if (
      (currentStatus === DriverAvailabilityStatus.BUSY &&
        newStatus === DriverAvailabilityStatus.AVAILABLE) ||
      (currentStatus === DriverAvailabilityStatus.AVAILABLE &&
        newStatus === DriverAvailabilityStatus.BUSY)
    ) {
      return { canChange: true };
    }

    if (currentStatus.toString() === newStatus.toString()) {
      return { canChange: true };
    }

    return {
      canChange: false,
      reason: 'Invalid status transition',
    };
  }

  /**
   * Get drivers by availability status
   */
  @WithErrorHandling([])
  async getDriversByAvailability(
    status: DriverAvailabilityStatus,
  ): Promise<string[]> {
    const activeDrivers = await this.unifiedUserStatusService.getActiveUsers(
      UserType.DRIVER,
    );
    const driversWithStatus: string[] = [];

    // Batch process for efficiency
    const batchSize = 50;
    for (let i = 0; i < activeDrivers.length; i += batchSize) {
      const batch = activeDrivers.slice(i, i + batchSize);
      const pipeline = this.client.multi();

      batch.forEach((driverId) => {
        pipeline.get(RedisKeyGenerator.driverAvailability(driverId));
      });

      const results = await pipeline.exec();

      if (results) {
        for (let j = 0; j < batch.length; j++) {
          const driverStatus = results[j][1] as DriverAvailabilityStatus;
          const driverId = batch[j];

          if (driverStatus === status) {
            driversWithStatus.push(driverId);
          } else if (!driverStatus && status === DriverAvailabilityStatus.BUSY) {
            // Default to BUSY if no status set
            driversWithStatus.push(driverId);
          }
        }
      }
    }

    return driversWithStatus;
  }

  /**
   * Get available drivers for trip assignment
   */
  @WithErrorHandling([])
  async getAvailableDriversForTrip(): Promise<string[]> {
    return await this.getDriversByAvailability(DriverAvailabilityStatus.AVAILABLE);
  }

  /**
   * Auto-set inactive available drivers to busy
   */
  @WithErrorHandling([])
  async autoSetInactiveDriversToBusy(): Promise<string[]> {
    const availableDrivers = await this.getDriversByAvailability(
      DriverAvailabilityStatus.AVAILABLE,
    );
    const changedDrivers: string[] = [];

    for (const driverId of availableDrivers) {
      const isRecentlyActive = await this.unifiedUserStatusService.isUserRecentlyActive(
        driverId,
        UserType.DRIVER,
      );

      if (!isRecentlyActive) {
        await this.updateDriverAvailability(
          driverId,
          DriverAvailabilityStatus.BUSY,
        );
        changedDrivers.push(driverId);

        this.customLogger.info(
          `Driver ${driverId} automatically set to BUSY due to inactivity`,
          {
            userId: driverId,
            userType: UserType.DRIVER,
            action: 'auto_set_busy',
            newStatus: DriverAvailabilityStatus.BUSY,
          },
        );
      }
    }

    return changedDrivers;
  }

  /**
   * Set driver availability on connect
   */
  @WithErrorHandling()
  async setDriverAvailabilityOnConnect(driverId: string): Promise<void> {
    // Set to AVAILABLE by default when driver connects
    await this.updateDriverAvailability(driverId, DriverAvailabilityStatus.AVAILABLE);
  }

  /**
   * Handle driver availability on disconnect
   */
  @WithErrorHandling()
  async handleDriverAvailabilityOnDisconnect(driverId: string): Promise<void> {
    const currentStatus = await this.getDriverAvailability(driverId);
    
    // Only clear availability if not on trip
    if (currentStatus !== DriverAvailabilityStatus.ON_TRIP) {
      await this.deleteDriverAvailability(driverId);
    }

    this.customLogger.info(
      `Driver ${driverId} availability handled on disconnect`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        action: 'handle_disconnect_availability',
        currentStatus,
        statusCleared: currentStatus !== DriverAvailabilityStatus.ON_TRIP,
      },
    );
  }
}