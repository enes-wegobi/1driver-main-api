import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { UserType } from 'src/common/user-type.enum';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { FindNearbyUsersResult } from '../dto/nearby-user.dto';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

@Injectable()
export class NearbySearchService extends BaseRedisService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  @WithErrorHandling([])
  async findNearbyUsers(
    userType: UserType,
    latitude: number,
    longitude: number,
    radius: number = 5,
    onlyAvailable: boolean = false,
  ): Promise<FindNearbyUsersResult> {
    const geoKey = RedisKeyGenerator.nearbyUsers(userType);

    const results = await this.client.call(
      'GEORADIUS',
      geoKey,
      longitude.toString(),
      latitude.toString(),
      radius.toString(),
      'km',
      'WITHDIST',
      'WITHCOORD',
    );

    // Process results to get more information about each user
    const enhancedResults: any[] = [];

    if (results && Array.isArray(results)) {
      for (const result of results) {
        // Each result is an array: [userId, distance, [longitude, latitude]]
        if (
          Array.isArray(result) &&
          result.length >= 3 &&
          result[0] &&
          result[1] &&
          result[2]
        ) {
          const userId = result[0].toString();
          const distance = parseFloat(result[1].toString());
          const coords = result[2];

          // Get additional user data if available
          const locationKey = RedisKeyGenerator.userLocation(userId);
          const locationDataStr = await this.client.get(locationKey);
          const userData = locationDataStr ? JSON.parse(locationDataStr) : null;

          // Skip if we only want available drivers and this one isn't available
          if (
            onlyAvailable &&
            userType === 'driver' &&
            userData?.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE
          ) {
            continue;
          }

          // Create a new object with all properties
          if (
            Array.isArray(coords) &&
            coords.length >= 2 &&
            coords[0] &&
            coords[1]
          ) {
            enhancedResults.push({
              userId,
              distance,
              coordinates: {
                longitude: parseFloat(coords[0].toString()),
                latitude: parseFloat(coords[1].toString()),
              },
              ...(userData || {}), // Use empty object if userData is null
            });
          }
        }
      }
    }

    return enhancedResults;
  }

  @WithErrorHandling([])
  async findNearbyAvailableDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<FindNearbyUsersResult> {
    return this.findNearbyUsers(
      UserType.DRIVER,
      latitude,
      longitude,
      radius,
      true,
    );
  }
}
