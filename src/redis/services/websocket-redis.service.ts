import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { UserType } from '../../common/user-type.enum';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { LoggerService } from 'src/logger/logger.service';
import { UnifiedUserStatusService } from './unified-user-status.service';
import { AppState } from '../../common/enums/app-state.enum';

export interface ActiveWebSocketConnection {
  socketId: string;
  deviceId: string;
  connectedAt: string;
  lastActivity: string;
}

@Injectable()
export class WebSocketRedisService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
    private readonly unifiedUserStatusService: UnifiedUserStatusService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Set active WebSocket connection for a user (single connection per user)
   * If user already has an active connection, return the previous one
   */
  @WithErrorHandling()
  async setActiveConnection(
    userId: string,
    userType: UserType,
    socketId: string,
    deviceId: string,
  ): Promise<ActiveWebSocketConnection | null> {
    // Get existing connection first
    const existingConnection = await this.getActiveConnection(userId, userType);

    // Use unified service to set user active with WebSocket data
    const previousStatus = await this.unifiedUserStatusService.setUserActive(
      userId,
      userType,
      AppState.FOREGROUND,
      { socketId, deviceId },
    );

    this.customLogger.info(
      `WebSocket connection set for user ${userId} (${userType}), socket: ${socketId}, device: ${deviceId}`,
    );

    // Return previous WebSocket connection if it existed
    return previousStatus?.websocket || null;
  }

  /**
   * Get active WebSocket connection for a user
   */
  @WithErrorHandling(null)
  async getActiveConnection(
    userId: string,
    userType: UserType,
  ): Promise<ActiveWebSocketConnection | null> {
    const connection = await this.unifiedUserStatusService.getWebSocketConnection(userId, userType);
    return connection || null;
  }

  /**
   * Remove active WebSocket connection for a user
   */
  @WithErrorHandling()
  async removeActiveConnection(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    await this.unifiedUserStatusService.setUserInactive(userId, userType);

    this.customLogger.info(
      `WebSocket connection removed for user ${userId} (${userType})`,
    );

    return true;
  }

  /**
   * Update last activity timestamp for an active WebSocket connection
   */
  @WithErrorHandling()
  async updateLastActivity(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    return await this.unifiedUserStatusService.updateHeartbeat(
      userId,
      userType,
      true, // updateWebSocketActivity = true
    );
  }

  /**
   * Check if a specific socket is the active connection for a user
   */
  @WithErrorHandling(false)
  async isActiveSocket(
    userId: string,
    userType: UserType,
    socketId: string,
  ): Promise<boolean> {
    return await this.unifiedUserStatusService.isActiveSocket(
      userId,
      userType,
      socketId,
    );
  }
}
