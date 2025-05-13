import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class BaseRedisService implements OnModuleInit, OnModuleDestroy {
  protected client: RedisClientType;
  protected readonly logger = new Logger(BaseRedisService.name);
  protected DRIVER_LOCATION_EXPIRY: number;
  protected ACTIVE_DRIVER_EXPIRY: number;
  protected ACTIVE_CUSTOMER_EXPIRY: number;

  constructor(protected configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('redis.url'),
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

    this.client.on('error', (err) =>
      this.logger.error('Redis Client Error', err),
    );
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  getRedisClient(): RedisClientType {
    return this.client;
  }
}
