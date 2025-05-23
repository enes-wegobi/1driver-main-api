import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { UserType } from '../../common/user-type.enum';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { RedisKeyGenerator } from '../redis-key.generator';

@Injectable()
export class TokenManagerService extends BaseRedisService {
  private readonly TOKEN_EXPIRY_BUFFER = 60; // 1 minute buffer

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Store a new active token for a user
   * @param userId The user ID
   * @param userType The user type (customer or driver)
   * @param token The JWT token
   * @param deviceId The device ID
   * @param expiresIn Token expiration time in seconds
   */
  @WithErrorHandling()
  async storeActiveToken(
    userId: string,
    userType: UserType,
    token: string,
    deviceId: string,
    expiresIn: number,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    const tokenData = {
      token,
      deviceId,
      createdAt: new Date().toISOString(),
    };

    // Store with TTL slightly longer than the token expiration
    const ttl = (expiresIn + this.TOKEN_EXPIRY_BUFFER) * 1000; // Add buffer and convert to milliseconds
    await this.client.set(key, JSON.stringify(tokenData));
    await this.client.pexpire(key, ttl);
    return true;
  }

  /**
   * Get the active token for a user
   * @param userId The user ID
   * @param userType The user type (customer or driver)
   * @returns The active token data or null if not found
   */
  @WithErrorHandling(null)
  async getActiveToken(
    userId: string,
    userType: UserType,
  ): Promise<{ token: string; deviceId: string } | null> {
    const key = RedisKeyGenerator.userActiveToken(userId, userType);
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
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
  async blacklistToken(token: string, expirationTime?: number): Promise<boolean> {
    // If no expiration time is provided, we'll set a default expiration of 24 hours
    // This is a fallback for cases where the token is invalidated without knowing its expiration
    const defaultExpirySeconds = 86400; // 24 hours in seconds
    
    if (!expirationTime) {
      this.logger.warn(`No expiration time provided for blacklisting token, using default expiry of ${defaultExpirySeconds} seconds`);
      
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
