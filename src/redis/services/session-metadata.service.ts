import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { UserType } from '../../common/user-type.enum';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { RedisKeyGenerator } from '../redis-key.generator';
import { LoggerService } from 'src/logger/logger.service';

export interface SessionActivity {
  timestamp: string;
  action: 'login' | 'logout' | 'force_logout' | 'token_refresh' | 'activity';
  deviceId: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export interface SessionAnalytics {
  userId: string;
  userType: UserType;
  totalSessions: number;
  activeDevices: string[];
  lastActivity: string;
  averageSessionDuration: number;
  securityEvents: number;
  recentActivity: SessionActivity[];
}

@Injectable()
export class SessionMetadataService extends BaseRedisService {
  private readonly ACTIVITY_HISTORY_TTL = 30 * 24 * 60 * 60; // 30 days
  private readonly MAX_ACTIVITY_ENTRIES = 100;

  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Log session activity for analytics and security monitoring
   * @param userId The user ID
   * @param userType The user type
   * @param activity The session activity data
   */
  @WithErrorHandling()
  async logSessionActivity(
    userId: string,
    userType: UserType,
    activity: SessionActivity,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.sessionActivity(userId, userType);
    
    // Get existing activities
    const existingData = await this.client.get(key);
    const activities: SessionActivity[] = existingData ? JSON.parse(existingData) : [];
    
    // Add new activity at the beginning
    activities.unshift(activity);
    
    // Keep only the latest entries
    if (activities.length > this.MAX_ACTIVITY_ENTRIES) {
      activities.splice(this.MAX_ACTIVITY_ENTRIES);
    }
    
    // Store updated activities
    await this.client.set(key, JSON.stringify(activities));
    await this.client.expire(key, this.ACTIVITY_HISTORY_TTL);
    
    this.customLogger.info(
      `Session activity logged for user ${userId} (${userType}): ${activity.action} from device ${activity.deviceId}`,
    );
    
    return true;
  }

  /**
   * Get session analytics for a user
   * @param userId The user ID
   * @param userType The user type
   * @returns Session analytics data
   */
  @WithErrorHandling(null)
  async getSessionAnalytics(
    userId: string,
    userType: UserType,
  ): Promise<SessionAnalytics | null> {
    const key = RedisKeyGenerator.sessionActivity(userId, userType);
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }
    
    const activities: SessionActivity[] = JSON.parse(data);
    
    // Calculate analytics
    const deviceIds = new Set<string>();
    const sessionStarts = new Map<string, string>();
    const sessionDurations: number[] = [];
    let securityEvents = 0;
    
    activities.forEach((activity) => {
      deviceIds.add(activity.deviceId);
      
      if (activity.action === 'login') {
        sessionStarts.set(activity.deviceId, activity.timestamp);
      } else if (activity.action === 'logout' || activity.action === 'force_logout') {
        const startTime = sessionStarts.get(activity.deviceId);
        if (startTime) {
          const duration = new Date(activity.timestamp).getTime() - new Date(startTime).getTime();
          sessionDurations.push(duration);
          sessionStarts.delete(activity.deviceId);
        }
        if (activity.action === 'force_logout') {
          securityEvents++;
        }
      }
    });
    
    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
      : 0;
    
    const recentActivity = activities.slice(0, 10); // Last 10 activities
    
    return {
      userId,
      userType,
      totalSessions: sessionStarts.size + sessionDurations.length,
      activeDevices: Array.from(deviceIds),
      lastActivity: activities.length > 0 ? activities[0].timestamp : '',
      averageSessionDuration: Math.round(averageSessionDuration / 1000 / 60), // Convert to minutes
      securityEvents,
      recentActivity,
    };
  }

  /**
   * Track device login attempt
   * @param userId The user ID
   * @param userType The user type
   * @param deviceId The device ID
   * @param ipAddress The IP address
   * @param userAgent The user agent
   * @param isNewDevice Whether this is a new device
   */
  @WithErrorHandling()
  async trackDeviceLogin(
    userId: string,
    userType: UserType,
    deviceId: string,
    ipAddress?: string,
    userAgent?: string,
    isNewDevice?: boolean,
  ): Promise<boolean> {
    const activity: SessionActivity = {
      timestamp: new Date().toISOString(),
      action: 'login',
      deviceId,
      ipAddress,
      userAgent,
      details: {
        isNewDevice,
      },
    };
    
    return this.logSessionActivity(userId, userType, activity);
  }

  /**
   * Track force logout event
   * @param userId The user ID
   * @param userType The user type
   * @param oldDeviceId The device being logged out
   * @param newDeviceId The new device causing the logout
   * @param ipAddress The IP address of the new device
   */
  @WithErrorHandling()
  async trackForceLogout(
    userId: string,
    userType: UserType,
    oldDeviceId: string,
    newDeviceId: string,
    ipAddress?: string,
  ): Promise<boolean> {
    const activity: SessionActivity = {
      timestamp: new Date().toISOString(),
      action: 'force_logout',
      deviceId: oldDeviceId,
      ipAddress,
      details: {
        forcedByDevice: newDeviceId,
        reason: 'device_switch',
      },
    };
    
    return this.logSessionActivity(userId, userType, activity);
  }

  /**
   * Get suspicious activity alerts
   * @param userId The user ID
   * @param userType The user type
   * @param timeWindowHours Check for suspicious activity in the last N hours
   * @returns List of suspicious activities
   */
  @WithErrorHandling([])
  async getSuspiciousActivity(
    userId: string,
    userType: UserType,
    timeWindowHours: number = 24,
  ): Promise<SessionActivity[]> {
    const key = RedisKeyGenerator.sessionActivity(userId, userType);
    const data = await this.client.get(key);
    
    if (!data) {
      return [];
    }
    
    const activities: SessionActivity[] = JSON.parse(data);
    const cutoffTime = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000);
    
    return activities.filter((activity) => {
      const activityTime = new Date(activity.timestamp);
      return activityTime > cutoffTime && (
        activity.action === 'force_logout' ||
        (activity.action === 'login' && activity.details?.isNewDevice)
      );
    });
  }

  /**
   * Clean up old session activity data
   * @param userId The user ID
   * @param userType The user type
   * @param keepDays Number of days to keep
   */
  @WithErrorHandling()
  async cleanupOldActivity(
    userId: string,
    userType: UserType,
    keepDays: number = 30,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.sessionActivity(userId, userType);
    const data = await this.client.get(key);
    
    if (!data) {
      return true;
    }
    
    const activities: SessionActivity[] = JSON.parse(data);
    const cutoffTime = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000);
    
    const filteredActivities = activities.filter((activity) => {
      const activityTime = new Date(activity.timestamp);
      return activityTime > cutoffTime;
    });
    
    if (filteredActivities.length < activities.length) {
      await this.client.set(key, JSON.stringify(filteredActivities));
      await this.client.expire(key, this.ACTIVITY_HISTORY_TTL);
      
      this.customLogger.info(
        `Cleaned up ${activities.length - filteredActivities.length} old activity entries for user ${userId}`,
      );
    }
    
    return true;
  }
}