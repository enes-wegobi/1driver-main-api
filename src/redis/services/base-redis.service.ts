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
  protected client: Redis;
  protected readonly logger = new Logger(BaseRedisService.name);
  protected DRIVER_LOCATION_EXPIRY: number;
  protected ACTIVE_DRIVER_EXPIRY: number;
  protected ACTIVE_CUSTOMER_EXPIRY: number;
  protected ACTIVE_TRIP_EXPIRY: number;

  constructor(protected configService: ConfigService) {
    // Initialize with Valkey connection parameters
    this.client = new Redis({
      host: this.configService.get<string>('valkey.host', 'localhost'),
      port: this.configService.get<number>('valkey.port', 6379),
      username: this.configService.get<string>('valkey.username', ''),
      password: this.configService.get<string>('valkey.password', ''),
      tls: this.configService.get<boolean>('valkey.tls', false)
        ? {}
        : undefined,
    });

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

    this.client.on('error', (err) =>
      this.logger.error('Valkey Client Error', err),
    );

    this.client.on('connect', () => {
      this.logger.log('Valkey connection successful');
    });
  }

  async onModuleInit() {
    // ioredis automatically connects, no need to explicitly connect
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getRedisClient(): Redis {
    return this.client;
  }
}
