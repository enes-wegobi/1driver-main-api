import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { LoggerService } from '../../logger/logger.service';
import { UserType } from 'src/common/user-type.enum';
import { UnifiedUserStatusService } from './unified-user-status.service';
import { DriverAvailabilityService } from './driver-availability.service';

@Injectable()
export class DriverStatusService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
    private readonly unifiedUserStatusService: UnifiedUserStatusService,
    private readonly driverAvailabilityService: DriverAvailabilityService,
  ) {
    super(configService, customLogger);
  }

  @WithErrorHandling()
  async markDriverAsDisconnected(driverId: string) {
    await this.unifiedUserStatusService.setUserInactive(driverId, UserType.DRIVER);
    await this.driverAvailabilityService.handleDriverAvailabilityOnDisconnect(driverId);
    return true;
  }

  @WithErrorHandling()
  async markDriverAsConnected(driverId: string) {
    await this.unifiedUserStatusService.setUserActive(driverId, UserType.DRIVER);
    await this.driverAvailabilityService.setDriverAvailabilityOnConnect(driverId);
    return true;
  }

  @WithErrorHandling()
  async updateDriverHeartbeat(driverId: string): Promise<void> {
    await this.unifiedUserStatusService.updateHeartbeat(driverId, UserType.DRIVER);
  }

  @WithErrorHandling(false)
  async isDriverHeartbeatActive(driverId: string): Promise<boolean> {
    return await this.unifiedUserStatusService.isUserActive(driverId, UserType.DRIVER);
  }

  @WithErrorHandling([])
  async getDriversWithActiveHeartbeat(): Promise<string[]> {
    return await this.unifiedUserStatusService.getActiveUsers(UserType.DRIVER);
  }

  @WithErrorHandling()
  async updateDriverAvailability(
    driverId: string,
    status: DriverAvailabilityStatus,
  ) {
    return await this.driverAvailabilityService.updateDriverAvailability(driverId, status);
  }

  @WithErrorHandling()
  async deleteDriverAvailability(driverId: string): Promise<boolean> {
    return await this.driverAvailabilityService.deleteDriverAvailability(driverId);
  }

  @WithErrorHandling(DriverAvailabilityStatus.BUSY)
  async getDriverAvailability(
    driverId: string,
  ): Promise<DriverAvailabilityStatus> {
    return await this.driverAvailabilityService.getDriverAvailability(driverId);
  }

  @WithErrorHandling(false)
  async isDriverActive(driverId: string): Promise<boolean> {
    return await this.unifiedUserStatusService.isUserActive(driverId, UserType.DRIVER);
  }

  @WithErrorHandling([])
  async getActiveDrivers(): Promise<string[]> {
    return await this.unifiedUserStatusService.getActiveUsers(UserType.DRIVER);
  }

  @WithErrorHandling([])
  async checkDriversActiveStatus(
    driverIds: string[],
  ): Promise<{ driverId: string; isActive: boolean }[]> {
    return await this.unifiedUserStatusService.checkUsersActiveStatus(
      driverIds,
      UserType.DRIVER,
    );
  }

  @WithErrorHandling(false)
  async isDriverRecentlyActive(driverId: string): Promise<boolean> {
    return await this.unifiedUserStatusService.isUserRecentlyActive(
      driverId,
      UserType.DRIVER,
    );
  }

  @WithErrorHandling(false)
  async canAssignTripToDriver(driverId: string): Promise<boolean> {
    return await this.driverAvailabilityService.canAssignTripToDriver(driverId);
  }

  @WithErrorHandling({ canChange: false, reason: 'Unknown error' })
  async canChangeAvailability(
    driverId: string,
    newStatus: DriverAvailabilityStatus,
  ): Promise<{ canChange: boolean; reason?: string }> {
    return await this.driverAvailabilityService.canChangeAvailability(
      driverId,
      newStatus,
    );
  }

  @WithErrorHandling([])
  async cleanupStaleDrivers(): Promise<string[]> {
    return await this.unifiedUserStatusService.cleanupStaleUsers(UserType.DRIVER);
  }

  @WithErrorHandling([])
  async cleanupStaleDriversAdvanced(): Promise<{
    heartbeatExpired: string[];
    availabilityChanged: string[];
  }> {
    const heartbeatExpired = await this.unifiedUserStatusService.cleanupStaleUsers(UserType.DRIVER);
    const availabilityChanged = await this.driverAvailabilityService.autoSetInactiveDriversToBusy();

    return { heartbeatExpired, availabilityChanged };
  }

  // ========== APP STATE METHODS ==========

  @WithErrorHandling()
  async updateDriverAppState(
    driverId: string,
    appState: AppState,
  ): Promise<void> {
    await this.unifiedUserStatusService.updateAppState(driverId, UserType.DRIVER, appState);
  }

  @WithErrorHandling()
  async getDriverAppState(driverId: string): Promise<AppState> {
    return await this.unifiedUserStatusService.getAppState(driverId, UserType.DRIVER);
  }

  @WithErrorHandling()
  async setDriverAppStateOnConnect(driverId: string): Promise<void> {
    await this.unifiedUserStatusService.updateAppState(driverId, UserType.DRIVER, AppState.FOREGROUND);
  }

  @WithErrorHandling()
  async setDriverAppStateOnDisconnect(driverId: string): Promise<void> {
    await this.unifiedUserStatusService.setUserInactive(driverId, UserType.DRIVER);

    this.customLogger.debug(
      `Driver ${driverId} app state deleted on disconnect`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        action: 'delete_app_state_on_disconnect',
      },
    );
  }
}
