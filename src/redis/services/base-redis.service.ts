import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class BaseRedisService implements OnModuleInit, OnModuleDestroy {
  // Static Redis client instance shared across all instances of this service
  private static redisClient: Redis | null = null;

  // Protected accessor for the static client
  protected get client(): Redis {
    if (!BaseRedisService.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return BaseRedisService.redisClient;
  }

  protected readonly customLogger?: LoggerService;
  protected DRIVER_LOCATION_EXPIRY: number;
  protected ACTIVE_DRIVER_EXPIRY: number;
  protected ACTIVE_CUSTOMER_EXPIRY: number;
  protected ACTIVE_TRIP_EXPIRY: number;

  constructor(
    protected configService: ConfigService,
    customLogger?: LoggerService,
  ) {
    this.customLogger = customLogger;
    // Initialize the Redis client only once (singleton pattern)
    if (!BaseRedisService.redisClient) {
      const host = this.configService.get<string>('valkey.host', 'localhost');
      const port = this.configService.get<number>('valkey.port', 6379);
      const username = this.configService.get<string>('valkey.username', '');
      const password = this.configService.get<string>('valkey.password', '');
      const tls = this.configService.get<boolean>('valkey.tls', false);

      console.log('BaseRedisService Valkey Config:', {
        host,
        port,
        username,
        hasPassword: !!password,
        tls,
      });

      BaseRedisService.redisClient = new Redis({
        host,
        port,
        username,
        password,
        tls: tls ? {} : undefined,
      });

      // Set up event listeners only once
      BaseRedisService.redisClient.on('error', (err) => {
        if (this.customLogger) {
          this.customLogger.logError(err, {
            type: 'redis_connection_error',
            service: 'valkey',
          });
        }
      });

      BaseRedisService.redisClient.on('connect', () => {
        if (this.customLogger) {
          this.customLogger.info('Valkey connection established', {
            type: 'redis_connection_success',
            service: 'valkey',
          });
        }
      });
    }

    // Initialize expiry times from configuration with defaults
    this.DRIVER_LOCATION_EXPIRY = this.configService.get<number>(
      'redis.driverLocationExpiry',
      900,
    ); // Default: 15 minutes
    this.ACTIVE_DRIVER_EXPIRY = this.configService.get<number>(
      'redis.activeDriverExpiry',
      1800,
    ); // Default: 30 minutes
    this.ACTIVE_CUSTOMER_EXPIRY = this.configService.get<number>(
      'redis.activeCustomerExpiry',
      1800,
    ); // Default: 30 minutes
    this.ACTIVE_TRIP_EXPIRY = this.configService.get<number>(
      'redis.activeTripExpiry',
      3600,
    ); // Default: 60 minutes
  }

  async onModuleInit() {
    // ioredis automatically connects, no need to explicitly connect
  }

  async onModuleDestroy() {
    // Only quit the client when the application is shutting down
    // and only if we're the last service to be destroyed
    // This is a simplistic approach - in a real app you might want to use a reference counter
    if (BaseRedisService.redisClient) {
      await BaseRedisService.redisClient.quit();
      BaseRedisService.redisClient = null;
    }
  }

  getRedisClient(): Redis {
    if (!BaseRedisService.redisClient) {
      throw new Error('Redis client not initialized');
    }
    return BaseRedisService.redisClient;
  }
}
