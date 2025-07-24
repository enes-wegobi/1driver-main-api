import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { UserType } from 'src/common/user-type.enum';
import { AuthEventsService } from 'src/events/auth-events.service';
import { ForceLogoutRequestedEvent } from 'src/events/types/auth-events.types';

export interface ForceLogoutResult {
  success: boolean;
  webSocketNotified: boolean;
  pushNotificationSent: boolean;
  sessionLogged: boolean;
  error?: string;
}

@Injectable()
export class ForceLogoutService {
  constructor(
    private readonly logger: LoggerService,
    private readonly authEvents: AuthEventsService,
  ) {}

  /**
   * Execute complete force logout process
   * @param userId The user ID being logged out
   * @param userType The user type
   * @param oldDeviceId The device being forced out
   * @param newDeviceId The new device causing the logout
   * @param reason Reason for the force logout
   * @param metadata Additional metadata
   */
  async executeForceLogout(
    userId: string,
    userType: UserType,
    oldDeviceId: string,
    newDeviceId: string,
    reason: string = 'new_device_login',
    metadata?: {
      ipAddress?: string;
      userAgent?: string;
      oldSessionInfo?: any;
      expoToken?: string;
    },
  ): Promise<ForceLogoutResult> {
    const result: ForceLogoutResult = {
      success: true,
      webSocketNotified: true,
      pushNotificationSent: true,
      sessionLogged: true,
    };

    try {
      const forceLogoutEvent: ForceLogoutRequestedEvent = {
        userId,
        userType,
        oldDeviceId,
        newDeviceId,
        reason,
        metadata,
        timestamp: new Date(),
      };

      this.authEvents.emitForceLogoutRequested(forceLogoutEvent);

      this.logger.info('Force logout event emitted successfully', {
        userId,
        userType,
        oldDeviceId,
        newDeviceId,
        reason,
      });

      return result;
    } catch (error) {
      this.logger.error('Force logout process failed', {
        userId,
        userType,
        oldDeviceId,
        newDeviceId,
        error: error.message,
      });

      result.success = false;
      result.webSocketNotified = false;
      result.pushNotificationSent = false;
      result.sessionLogged = false;
      result.error = error.message;
      return result;
    }
  }
}
