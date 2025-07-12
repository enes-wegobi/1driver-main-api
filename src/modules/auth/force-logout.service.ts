import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { UserType } from 'src/common/user-type.enum';
import { SessionMetadataService } from 'src/redis/services/session-metadata.service';
import { AuthEventsService } from 'src/events/auth-events.service';
import { ForceLogoutRequestedEvent, SuspiciousActivityDetectedEvent } from 'src/events/types/auth-events.types';

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
    private readonly sessionMetadata: SessionMetadataService,
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


  /**
   * Handle suspicious login attempts
   * @param userId The user ID
   * @param userType The user type
   * @param attempts Array of recent login attempts from different devices/IPs
   */
  async handleSuspiciousActivity(
    userId: string,
    userType: UserType,
    attempts: {
      deviceId: string;
      ipAddress?: string;
      timestamp: string;
      userAgent?: string;
    }[],
  ): Promise<void> {
    const suspiciousActivityEvent: SuspiciousActivityDetectedEvent = {
      userId,
      userType,
      attempts,
      timestamp: new Date(),
    };

    this.authEvents.emitSuspiciousActivityDetected(suspiciousActivityEvent);

    this.logger.info('Suspicious activity event emitted', {
      userId,
      userType,
      attemptCount: attempts.length,
    });
  }

  /**
   * Get security summary for a user
   * @param userId The user ID
   * @param userType The user type
   * @returns Security-related session information
   */
  async getSecuritySummary(
    userId: string,
    userType: UserType,
  ): Promise<{
    recentForceLogouts: number;
    suspiciousActivity: number;
    totalDevices: number;
    lastActivity: string;
  }> {
    try {
      const analytics = await this.sessionMetadata.getSessionAnalytics(userId, userType);
      const suspicious = await this.sessionMetadata.getSuspiciousActivity(userId, userType, 24);

      return {
        recentForceLogouts: analytics?.securityEvents || 0,
        suspiciousActivity: suspicious.length,
        totalDevices: analytics?.activeDevices.length || 0,
        lastActivity: analytics?.lastActivity || '',
      };
    } catch (error) {
      this.logger.error('Failed to get security summary', {
        userId,
        userType,
        error: error.message,
      });

      return {
        recentForceLogouts: 0,
        suspiciousActivity: 0,
        totalDevices: 0,
        lastActivity: '',
      };
    }
  }
}