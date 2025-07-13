import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { UserType } from '../../common/user-type.enum';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { RedisKeyGenerator } from '../redis-key.generator';
import { LoggerService } from 'src/logger/logger.service';

export interface SessionMetadata {
  token: string;
  deviceId: string;
  deviceInfo?: {
    platform?: string;
    osVersion?: string;
    appVersion?: string;
    model?: string;
  };
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastSeenAt: string;
  isActive: boolean;
}

@Injectable()
export class TokenManagerService extends BaseRedisService {
  private readonly TOKEN_EXPIRY_BUFFER = 60; // 1 minute buffer

  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Get the active session for a user
   * @param userId The user ID
   * @param userType The user type (customer or driver)
   * @returns The active session metadata or null if not found
   */
  @WithErrorHandling(null)
  async getActiveToken(
    userId: string,
    userType: UserType,
  ): Promise<SessionMetadata | null> {
    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update the last seen timestamp for an active session
   * @param userId The user ID
   * @param userType The user type
   * @param ipAddress Optional IP address for tracking
   */
  @WithErrorHandling()
  async updateLastSeen(
    userId: string,
    userType: UserType,
    ipAddress?: string,
  ): Promise<boolean> {
    const session = await this.getActiveToken(userId, userType);
    if (!session) {
      return false;
    }

    session.lastSeenAt = new Date().toISOString();
    if (ipAddress && ipAddress !== session.ipAddress) {
      this.customLogger.warn(
        `IP address changed for user ${userId} (${userType}) from ${session.ipAddress} to ${ipAddress}`,
      );
      session.ipAddress = ipAddress;
    }

    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    await this.client.set(key, JSON.stringify(session));
    
    // Maintain the existing TTL
    const ttl = await this.client.pttl(key);
    if (ttl > 0) {
      await this.client.pexpire(key, ttl);
    }

    return true;
  }

  /**
   * Invalidate and remove an active token from Redis
   * @param userId The user ID
   * @param userType The user type
   */
  @WithErrorHandling()
  async invalidateToken(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    const result = await this.client.del(key);
    
    this.customLogger.info(
      `Token invalidated for user ${userId} (${userType})`,
    );
    
    return result > 0;
  }

  /**
   * Atomically replace an existing active token with a new one
   * @param userId The user ID
   * @param userType The user type
   * @param newToken The new JWT token
   * @param newDeviceId The new device ID
   * @param expiresIn Token expiration time in seconds
   * @param metadata Additional session metadata
   * @returns The previous session metadata if it existed
   */
  @WithErrorHandling()
  async replaceActiveToken(
    userId: string,
    userType: UserType,
    newToken: string,
    newDeviceId: string,
    expiresIn: number,
    metadata?: {
      deviceInfo?: SessionMetadata['deviceInfo'];
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<SessionMetadata | null> {
    // Get existing session before replacing
    const existingSession = await this.getActiveToken(userId, userType);
    
    const now = new Date().toISOString();
    const sessionData: SessionMetadata = {
      token: newToken,
      deviceId: newDeviceId,
      deviceInfo: metadata?.deviceInfo,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      createdAt: now,
      lastSeenAt: now,
      isActive: true,
    };

    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    
    // Atomically replace the session data
    const ttl = (expiresIn + this.TOKEN_EXPIRY_BUFFER) * 1000;
    await this.client.set(key, JSON.stringify(sessionData));
    await this.client.pexpire(key, ttl);

    this.customLogger.info(
      `Session replaced for user ${userId} (${userType}) from device ${existingSession?.deviceId || 'none'} to ${newDeviceId} at IP ${metadata?.ipAddress}`,
    );

    return existingSession;
  }
}
