import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

@Injectable()
export class LocationService extends BaseRedisService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  @WithErrorHandling()
  async storeUserLocation(userId: string, userType: string, locationData: any) {
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.userLocation(userId);
    const data = {
      ...locationData,
      userId,
      userType,
      updatedAt: new Date().toISOString(),
    };

    pipeline.set(key, JSON.stringify(data));
    pipeline.expire(key, this.DRIVER_LOCATION_EXPIRY);

    const geoKey = RedisKeyGenerator.geoIndex(userType);
    pipeline.geoAdd(geoKey, {
      longitude: locationData.longitude,
      latitude: locationData.latitude,
      member: userId,
    });

    await pipeline.exec();
    return true;
  }

  @WithErrorHandling(null)
  async getUserLocation(userId: string) {
    const key = RedisKeyGenerator.userLocation(userId);
    const locationData = await this.client.get(key);
    return locationData ? JSON.parse(locationData) : null;
  }
}
