import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { BaseRedisService } from 'src/redis/services/base-redis.service';
import { LoggerService } from 'src/logger/logger.service';
import { MobileConfigResponseDto } from '../dto/mobile-config-response.dto';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class MobileConfigService extends BaseRedisService {
  private readonly MOBILE_CONFIG_CACHE_KEY = 'mobile:config';

  constructor(
    protected configService: NestConfigService,
    private readonly appConfigService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    super(configService, logger);
  }

  async getMobileConfig(): Promise<MobileConfigResponseDto> {
    try {
      // Try to get from cache first
      const cachedConfig = await this.getCachedConfig();
      if (cachedConfig) {
        this.logger.info('Mobile config retrieved from cache');
        return cachedConfig;
      }

      // Generate fresh config
      const config = await this.generateFreshConfig();
      
      // Cache the config
      await this.cacheConfig(config);
      
      this.logger.info('Mobile config generated and cached');
      return config;
    } catch (error) {
      this.logger.error(
        `Error retrieving mobile config: ${error.message}`,
        error.stack,
      );
      
      // Fallback to direct config without caching
      return this.generateFreshConfig();
    }
  }

  private async getCachedConfig(): Promise<MobileConfigResponseDto | null> {
    try {
      const cachedData = await this.client.get(this.MOBILE_CONFIG_CACHE_KEY);
      
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      
      return null;
    } catch (error) {
      this.logger.error(
        `Error getting cached mobile config: ${error.message}`,
        error.stack,
      );
      return null;
    }
  }

  private async cacheConfig(config: MobileConfigResponseDto): Promise<void> {
    try {
      const ttlSeconds = this.appConfigService.mobileConfigCacheTtlSeconds;
      
      await this.client.setex(
        this.MOBILE_CONFIG_CACHE_KEY,
        ttlSeconds,
        JSON.stringify(config),
      );
      
      this.logger.info(
        `Mobile config cached with TTL: ${ttlSeconds} seconds`,
      );
    } catch (error) {
      this.logger.error(
        `Error caching mobile config: ${error.message}`,
        error.stack,
      );
    }
  }

  private async generateFreshConfig(): Promise<MobileConfigResponseDto> {
    return {
      buildVersion: this.appConfigService.mobileBuildVersion,
      otpExpiryMinutes: this.appConfigService.mobileOtpExpiryMinutes,
      tripCancellableTimeMinutes: this.appConfigService.mobileTripCancellableTimeMinutes,
      serverTimestamp: new Date().toISOString(),
    };
  }

  async invalidateCache(): Promise<void> {
    try {
      await this.client.del(this.MOBILE_CONFIG_CACHE_KEY);
      this.logger.info('Mobile config cache invalidated');
    } catch (error) {
      this.logger.error(
        `Error invalidating mobile config cache: ${error.message}`,
        error.stack,
      );
    }
  }
}