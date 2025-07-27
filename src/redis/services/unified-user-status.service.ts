import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { UserType } from '../../common/user-type.enum';
import { AppState } from '../../common/enums/app-state.enum';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { RedisKeyGenerator } from '../redis-key.generator';
import { LoggerService } from 'src/logger/logger.service';

export interface UserStatusData {
  timestamp: string;
  appState: AppState;
  websocket?: {
    socketId: string;
    deviceId: string;
    connectedAt: string;
    lastActivity: string;
  };
}

export interface UserStatus {
  isActive: boolean;
  data?: UserStatusData;
}

@Injectable()
export class UnifiedUserStatusService extends BaseRedisService {
  private readonly USER_STATUS_TTL = 30 * 60; // 30 minutes in seconds

  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Set user as active with optional WebSocket connection data
   */
  @WithErrorHandling()
  async setUserActive(
    userId: string,
    userType: UserType,
    appState: AppState = AppState.FOREGROUND,
    websocketData?: {
      socketId: string;
      deviceId: string;
    },
  ): Promise<UserStatusData | null> {
    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    const activeSetKey = RedisKeyGenerator.activeUsersSet(userType);

    // Get existing status to return previous WebSocket connection
    const existingStatus = await this.getUserStatus(userId, userType);

    const statusData: UserStatusData = {
      timestamp: new Date().toISOString(),
      appState,
      ...(websocketData && {
        websocket: {
          socketId: websocketData.socketId,
          deviceId: websocketData.deviceId,
          connectedAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
        },
      }),
    };

    const pipeline = this.client.multi();
    pipeline.set(key, JSON.stringify(statusData));
    pipeline.expire(key, this.USER_STATUS_TTL);
    pipeline.sadd(activeSetKey, userId);

    await pipeline.exec();

    this.customLogger.info(
      `User ${userId} (${userType}) marked as active`,
      {
        userId,
        userType,
        appState,
        hasWebSocket: !!websocketData,
      },
    );

    return existingStatus?.data || null;
  }

  /**
   * Update WebSocket connection for active user
   */
  @WithErrorHandling()
  async updateWebSocketConnection(
    userId: string,
    userType: UserType,
    socketId: string,
    deviceId: string,
  ): Promise<UserStatusData | null> {
    const status = await this.getUserStatus(userId, userType);
    if (!status.isActive) {
      return null;
    }

    const previousWebSocket = status.data?.websocket;

    const updatedData: UserStatusData = {
      ...status.data!,
      websocket: {
        socketId,
        deviceId,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      },
    };

    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    await this.client.set(key, JSON.stringify(updatedData));

    // Maintain existing TTL
    const ttl = await this.client.ttl(key);
    if (ttl > 0) {
      await this.client.expire(key, ttl);
    }

    this.customLogger.info(
      `WebSocket updated for user ${userId} (${userType})`,
      {
        userId,
        userType,
        newSocketId: socketId,
        previousSocketId: previousWebSocket?.socketId,
      },
    );

    return previousWebSocket ? { ...status.data!, websocket: previousWebSocket } : null;
  }

  /**
   * Update user's app state
   */
  @WithErrorHandling()
  async updateAppState(
    userId: string,
    userType: UserType,
    appState: AppState,
  ): Promise<boolean> {
    const status = await this.getUserStatus(userId, userType);
    if (!status.isActive) {
      return false;
    }

    const updatedData: UserStatusData = {
      ...status.data!,
      appState,
      timestamp: new Date().toISOString(),
    };

    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    await this.client.set(key, JSON.stringify(updatedData));

    // Maintain existing TTL
    const ttl = await this.client.ttl(key);
    if (ttl > 0) {
      await this.client.expire(key, ttl);
    }

    return true;
  }

  /**
   * Update user heartbeat and WebSocket activity
   */
  @WithErrorHandling()
  async updateHeartbeat(
    userId: string,
    userType: UserType,
    updateWebSocketActivity: boolean = false,
  ): Promise<boolean> {
    const status = await this.getUserStatus(userId, userType);
    if (!status.isActive) {
      // If user not active, set as active with FOREGROUND state
      await this.setUserActive(userId, userType, AppState.FOREGROUND);
      return true;
    }

    const updatedData: UserStatusData = {
      ...status.data!,
      timestamp: new Date().toISOString(),
    };

    if (updateWebSocketActivity && updatedData.websocket) {
      updatedData.websocket.lastActivity = new Date().toISOString();
    }

    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    const activeSetKey = RedisKeyGenerator.activeUsersSet(userType);

    const pipeline = this.client.multi();
    pipeline.set(key, JSON.stringify(updatedData));
    pipeline.expire(key, this.USER_STATUS_TTL);
    pipeline.sadd(activeSetKey, userId);

    await pipeline.exec();
    return true;
  }

  /**
   * Get user status with all data
   */
  @WithErrorHandling({ isActive: false })
  async getUserStatus(userId: string, userType: UserType): Promise<UserStatus> {
    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    const data = await this.client.get(key);

    if (!data) {
      return { isActive: false };
    }

    try {
      const statusData = JSON.parse(data) as UserStatusData;
      return { isActive: true, data: statusData };
    } catch (error) {
      this.customLogger.logError(error, {
        userId,
        userType,
        action: 'parse_user_status',
      });
      return { isActive: false };
    }
  }

  /**
   * Check if user is active (simple boolean check)
   */
  @WithErrorHandling(false)
  async isUserActive(userId: string, userType: UserType): Promise<boolean> {
    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Get user's WebSocket connection data
   */
  @WithErrorHandling(null)
  async getWebSocketConnection(
    userId: string,
    userType: UserType,
  ): Promise<UserStatusData['websocket'] | null> {
    const status = await this.getUserStatus(userId, userType);
    return status.data?.websocket || null;
  }

  /**
   * Get user's app state
   */
  @WithErrorHandling(null)
  async getAppState(userId: string, userType: UserType): Promise<AppState | null> {
    const status = await this.getUserStatus(userId, userType);
    return status.data?.appState || null;
  }

  /**
   * Check if a specific socket is active for user
   */
  @WithErrorHandling(false)
  async isActiveSocket(
    userId: string,
    userType: UserType,
    socketId: string,
  ): Promise<boolean> {
    const connection = await this.getWebSocketConnection(userId, userType);
    return connection ? connection.socketId === socketId : false;
  }

  /**
   * Remove user from active status
   */
  @WithErrorHandling()
  async setUserInactive(userId: string, userType: UserType): Promise<boolean> {
    const key = RedisKeyGenerator.userActiveStatus(userId, userType);
    const activeSetKey = RedisKeyGenerator.activeUsersSet(userType);

    const pipeline = this.client.multi();
    pipeline.del(key);
    pipeline.srem(activeSetKey, userId);

    await pipeline.exec();

    this.customLogger.info(
      `User ${userId} (${userType}) marked as inactive`,
      { userId, userType },
    );

    return true;
  }

  /**
   * Get all active users of a specific type
   */
  @WithErrorHandling([])
  async getActiveUsers(userType: UserType): Promise<string[]> {
    const activeSetKey = RedisKeyGenerator.activeUsersSet(userType);
    return await this.client.smembers(activeSetKey);
  }

  /**
   * Check multiple users' active status in batch
   */
  @WithErrorHandling([])
  async checkUsersActiveStatus(
    userIds: string[],
    userType: UserType,
  ): Promise<{ userId: string; isActive: boolean }[]> {
    if (userIds.length === 0) {
      return [];
    }

    const activeSetKey = RedisKeyGenerator.activeUsersSet(userType);
    const activeStatusArray = await this.client.call(
      'SMISMEMBER',
      activeSetKey,
      ...userIds,
    );

    return userIds.map((userId, index) => {
      const isActive = activeStatusArray
        ? activeStatusArray[index] === 1
        : false;
      return { userId, isActive };
    });
  }

  /**
   * Clean up stale users whose status has expired
   */
  @WithErrorHandling([])
  async cleanupStaleUsers(userType: UserType): Promise<string[]> {
    const cleanedUsers: string[] = [];
    const activeUsers = await this.getActiveUsers(userType);

    for (const userId of activeUsers) {
      const isActive = await this.isUserActive(userId, userType);
      if (!isActive) {
        await this.setUserInactive(userId, userType);
        cleanedUsers.push(userId);

        this.customLogger.info(
          `User ${userId} (${userType}) cleaned up due to status expiry`,
          {
            userId,
            userType,
            action: 'cleanup_stale_user',
          },
        );
      }
    }

    return cleanedUsers;
  }

  /**
   * Check if user was recently active (within last 2 minutes)
   */
  @WithErrorHandling(false)
  async isUserRecentlyActive(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    const status = await this.getUserStatus(userId, userType);
    if (!status.isActive) {
      return false;
    }

    const lastActiveTime = new Date(status.data!.timestamp).getTime();
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;

    return now - lastActiveTime < twoMinutes;
  }

}