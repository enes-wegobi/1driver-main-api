import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { UserType } from '../../common/user-type.enum';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { RedisKeyGenerator } from '../redis-key.generator';
import { LoggerService } from 'src/logger/logger.service';

export interface ActiveWebSocketConnection {
  socketId: string;
  deviceId: string;
  connectedAt: string;
  lastActivity: string;
}

@Injectable()
export class WebSocketRedisService extends BaseRedisService {
  private readonly WEBSOCKET_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
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
    const key = RedisKeyGenerator.userActiveWebSocket(userId, userType);

    // Get existing connection first
    const existingConnection = await this.getActiveConnection(userId, userType);

    const connectionData: ActiveWebSocketConnection = {
      socketId,
      deviceId,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    // Store new connection
    await this.client.set(key, JSON.stringify(connectionData));
    await this.client.expire(key, this.WEBSOCKET_TTL);

    this.customLogger.info(
      `WebSocket connection set for user ${userId} (${userType}), socket: ${socketId}, device: ${deviceId}`,
    );

    return existingConnection;
  }

  /**
   * Get active WebSocket connection for a user
   */
  @WithErrorHandling(null)
  async getActiveConnection(
    userId: string,
    userType: UserType,
  ): Promise<ActiveWebSocketConnection | null> {
    const key = RedisKeyGenerator.userActiveWebSocket(userId, userType);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Remove active WebSocket connection for a user
   */
  @WithErrorHandling()
  async removeActiveConnection(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.userActiveWebSocket(userId, userType);
    const result = await this.client.del(key);

    this.customLogger.info(
      `WebSocket connection removed for user ${userId} (${userType})`,
    );

    return result > 0;
  }

  /**
   * Update last activity timestamp for an active WebSocket connection
   */
  @WithErrorHandling()
  async updateLastActivity(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    const connection = await this.getActiveConnection(userId, userType);
    if (!connection) {
      return false;
    }

    connection.lastActivity = new Date().toISOString();

    const key = RedisKeyGenerator.userActiveWebSocket(userId, userType);
    await this.client.set(key, JSON.stringify(connection));

    // Maintain the existing TTL
    const ttl = await this.client.ttl(key);
    if (ttl > 0) {
      await this.client.expire(key, ttl);
    }

    return true;
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
    const connection = await this.getActiveConnection(userId, userType);
    return connection ? connection.socketId === socketId : false;
  }
}
