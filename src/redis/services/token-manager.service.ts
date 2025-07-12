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
   * Store a new active token for a user with comprehensive session metadata
   * @param userId The user ID
   * @param userType The user type (customer or driver)
   * @param token The JWT token
   * @param deviceId The device ID
   * @param expiresIn Token expiration time in seconds
   * @param metadata Additional session metadata
   */
  @WithErrorHandling()
  async storeActiveToken(
    userId: string,
    userType: UserType,
    token: string,
    deviceId: string,
    expiresIn: number,
    metadata?: {
      deviceInfo?: SessionMetadata['deviceInfo'];
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<SessionMetadata | null> {
    // Check for existing active session
    const existingSession = await this.getActiveToken(userId, userType);
    
    const now = new Date().toISOString();
    const sessionData: SessionMetadata = {
      token,
      deviceId,
      deviceInfo: metadata?.deviceInfo,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      createdAt: now,
      lastSeenAt: now,
      isActive: true,
    };

    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    
    // Store with TTL slightly longer than the token expiration
    const ttl = (expiresIn + this.TOKEN_EXPIRY_BUFFER) * 1000;
    await this.client.set(key, JSON.stringify(sessionData));
    await this.client.pexpire(key, ttl);

    this.customLogger.info(
      `New session created for user ${userId} (${userType}) from device ${deviceId} at IP ${metadata?.ipAddress}`,
    );

    return existingSession;
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
   * Check if a device switch has occurred
   * @param userId The user ID
   * @param userType The user type
   * @param currentDeviceId The current device ID
   * @returns True if device has switched, false otherwise
   */
  @WithErrorHandling(false)
  async hasDeviceSwitched(
    userId: string,
    userType: UserType,
    currentDeviceId: string,
  ): Promise<boolean> {
    const session = await this.getActiveToken(userId, userType);
    return session ? session.deviceId !== currentDeviceId : false;
  }

  /**
   * Invalidate the active token for a user
   * @param userId The user ID
   * @param userType The user type (customer or driver)
   * @returns True if successful, false otherwise
   */
  @WithErrorHandling()
  async invalidateActiveToken(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    // Get the current active token
    const activeToken = await this.getActiveToken(userId, userType);
    if (!activeToken) {
      return true; // No active token to invalidate
    }

    // Add the token to the blacklist
    await this.blacklistToken(activeToken.token);

    // Remove the active token
    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    await this.client.del(key);

    return true;
  }

  /**
   * Add a token to the blacklist
   * @param token The JWT token to blacklist
   * @param expirationTime The token expiration timestamp in seconds
   * @returns True if successful, false otherwise
   */
  @WithErrorHandling()
  async blacklistToken(
    token: string,
    expirationTime?: number,
  ): Promise<boolean> {
    // If no expiration time is provided, we'll set a default expiration of 24 hours
    // This is a fallback for cases where the token is invalidated without knowing its expiration
    const defaultExpirySeconds = 86400; // 24 hours in seconds

    if (!expirationTime) {
      this.customLogger.warn(
        `No expiration time provided for blacklisting token, using default expiry of ${defaultExpirySeconds} seconds`,
      );

      // Add to blacklist with default TTL
      const key = RedisKeyGenerator.tokenBlacklist(token);
      await this.client.set(key, 'true');
      await this.client.expire(key, defaultExpirySeconds);
      return true;
    }

    // Calculate remaining time until expiration
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expirationTime - now;

    // If token is already expired, no need to blacklist
    if (expiresIn <= 0) {
      return true;
    }

    // Add to blacklist with TTL equal to remaining time until expiration
    const key = RedisKeyGenerator.tokenBlacklist(token);
    await this.client.set(key, 'true');
    await this.client.expire(key, expiresIn);
    return true;
  }

  /**
   * Check if a token is blacklisted
   * @param token The JWT token to check
   * @returns True if blacklisted, false otherwise
   */
  @WithErrorHandling(false)
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = RedisKeyGenerator.tokenBlacklist(token);
    const result = await this.client.get(key);
    return result === 'true';
  }
}
