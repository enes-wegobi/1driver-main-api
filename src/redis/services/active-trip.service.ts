import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class ActiveTripService extends BaseRedisService {
  private readonly serviceLogger = new Logger(ActiveTripService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /*
    in this redis we can store trip id with connected driver and customer ids
  */

  @WithErrorHandling()
  async setUserActiveTripId(
    userId: string,
    userType: UserType,
    tripId: string,
  ): Promise<boolean> {
    this.serviceLogger.debug(
      `Setting active trip ID for ${userType} ${userId}: ${tripId}`,
    );
    const key = RedisKeyGenerator.userActiveTrip(userId, userType);
    await this.client.set(key, tripId);
    await this.client.expire(key, this.ACTIVE_TRIP_EXPIRY);
    return true;
  }

  @WithErrorHandling(null)
  async getUserActiveTripIfExists(
    userId: string,
    userType: UserType,
  ): Promise<string | null> {
    const key = RedisKeyGenerator.userActiveTrip(userId, userType);
    const tripId = await this.client.get(key);
    return tripId;
  }

  @WithErrorHandling()
  async removeUserActiveTrip(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    this.serviceLogger.debug(`Removing active trip for ${userType} ${userId}`);
    const key = RedisKeyGenerator.userActiveTrip(userId, userType);
    await this.client.del(key);
    return true;
  }

  @WithErrorHandling(false)
  async refreshUserActiveTripExpiry(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    const key = RedisKeyGenerator.userActiveTrip(userId, userType);
    const exists = await this.client.exists(key);

    if (exists === 1) {
      this.serviceLogger.debug(
        `Refreshing TTL for active trip of ${userType} ${userId}`,
      );
      await this.client.expire(key, this.ACTIVE_TRIP_EXPIRY);
      return true;
    }

    return false;
  }
}
