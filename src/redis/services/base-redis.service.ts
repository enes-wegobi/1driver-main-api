import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

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
  
  protected readonly logger = new Logger(BaseRedisService.name);
  protected DRIVER_LOCATION_EXPIRY: number;
  protected ACTIVE_DRIVER_EXPIRY: number;
  protected ACTIVE_CUSTOMER_EXPIRY: number;
  protected ACTIVE_TRIP_EXPIRY: number;

  constructor(protected configService: ConfigService) {
    // Initialize the Redis client only once (singleton pattern)
    if (!BaseRedisService.redisClient) {
      BaseRedisService.redisClient = new Redis({
        host: this.configService.get<string>('valkey.host', 'localhost'),
        port: this.configService.get<number>('valkey.port', 6379),
        username: this.configService.get<string>('valkey.username', ''),
        password: this.configService.get<string>('valkey.password', ''),
        tls: this.configService.get<boolean>('valkey.tls', false)
          ? {}
          : undefined,
      });
      
      // Set up event listeners only once
      BaseRedisService.redisClient.on('error', (err) =>
        this.logger.error('Valkey Client Error', err),
      );

      BaseRedisService.redisClient.on('connect', () => {
        this.logger.log('Valkey connection successful');
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
