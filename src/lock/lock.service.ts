import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { BaseRedisService } from 'src/redis/services/base-redis.service';

@Injectable()
export class LockService {
  private readonly lockPrefix = 'trip:lock:';

  constructor(
    private readonly baseRedisService: BaseRedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Acquires a lock for the given key
   * @param key The key to lock
   * @param ttl The time-to-live for the lock in milliseconds (default: 30 seconds)
   * @param retries Number of retries if lock acquisition fails (default: 1)
   * @param retryDelay Delay between retries in milliseconds (default: 200ms)
   * @returns True if the lock was acquired, false otherwise
   */
  async acquireLock(
    key: string,
    ttl: number = 30000,
    retries: number = 1,
    retryDelay: number = 200,
  ): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;
    let attempt = 0;

    while (attempt < retries) {
      const result = await this.baseRedisService
        .getRedisClient()
        .set(lockKey, Date.now().toString(), 'PX', ttl, 'NX');

      if (result === 'OK') {
        return true;
      }

      attempt++;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    return false;
  }

  /**
   * Releases a lock for the given key
   * @param key The key to unlock
   * @returns True if the lock was released, false otherwise
   */
  async releaseLock(key: string): Promise<boolean> {
    const lockKey = `${this.lockPrefix}${key}`;
    const result = await this.baseRedisService.getRedisClient().del(lockKey);

    const released = result === 1;
    return released;
  }

  /**
   * Gets the remaining time-to-live for a lock
   * @param key The key to check
   * @returns The remaining TTL in milliseconds, or -1 if the key does not exist, or -2 if the key exists but has no TTL
   */
  async getLockTTL(key: string): Promise<number> {
    const lockKey = `${this.lockPrefix}${key}`;
    return this.baseRedisService.getRedisClient().pttl(lockKey);
  }

  /**
   * Executes an operation with a lock
   * @param key The key to lock
   * @param operation The operation to execute while the lock is held
   * @param errorMessage Optional custom error message if lock acquisition fails
   * @param ttl The time-to-live for the lock in milliseconds (default: 30 seconds)
   * @param retries Number of retries if lock acquisition fails (default: 1)
   * @param retryDelay Delay between retries in milliseconds (default: 200ms)
   * @returns The result of the operation directly
   * @throws Error if lock acquisition fails or operation fails
   */
  async executeWithLock<T>(
    key: string,
    operation: () => Promise<T>,
    errorMessage?: string,
    ttl: number = 30000,
    retries: number = 1,
    retryDelay: number = 200,
  ): Promise<T> {
    // Try to acquire a lock
    const lockAcquired = await this.acquireLock(key, ttl, retries, retryDelay);
    if (!lockAcquired) {
      this.logger.warn(`Failed to acquire lock for key: ${key}`);
      throw new Error(errorMessage || `Failed to acquire lock for key: ${key}`);
    }

    try {
      // Execute the operation
      return await operation();
    } catch (error) {
      this.logger.error(
        `Error executing operation with lock for key: ${key}`,
        error,
      );
      throw error; // Re-throw the original error
    } finally {
      // Always release the lock, even if an error occurred
      await this.releaseLock(key);
    }
  }
}
