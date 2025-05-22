import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { FindNearbyUsersResult } from './dto/nearby-user.dto';
import { UserType } from 'src/common/user-type.enum';
import { RedisKeyGenerator } from './redis-key.generator';
import { BaseRedisService } from './services/base-redis.service';

@Injectable()
export class RedisService {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);
  private DRIVER_LOCATION_EXPIRY: number;
  private ACTIVE_DRIVER_EXPIRY: number;
  private ACTIVE_CUSTOMER_EXPIRY: number;

  constructor(
    private configService: ConfigService,
    private baseRedisService: BaseRedisService
  ) {
    // Use the Redis client from BaseRedisService instead of creating a new one
    this.client = this.baseRedisService.getRedisClient();

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
  }

  getRedisClient(): Redis {
    return this.client;
  }

  async storeUserLocation(userId: string, userType: string, locationData: any) {
    try {
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
      pipeline.geoadd(
        geoKey,
        locationData.longitude,
        locationData.latitude,
        userId,
      );

      await pipeline.exec();

      // Update active users set based on user type
      if (userType === 'driver') {
        await this.markDriverAsActive(userId);

        // If availability status is provided, update it
        if (locationData.availabilityStatus) {
          await this.updateDriverAvailability(
            userId,
            locationData.availabilityStatus,
          );
        }
      } else if (userType === 'customer') {
        await this.markCustomerAsActive(userId);
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error storing location for user ${userId}:`,
        error.message,
      );
      return false;
    }
  }

  async getUserLocation(userId: string) {
    const key = RedisKeyGenerator.userLocation(userId);
    const locationData = await this.client.get(key);
    return locationData ? JSON.parse(locationData) : null;
  }

  async getUserLocations(
    userIds: string[],
  ): Promise<{ [userId: string]: any }> {
    try {
      if (userIds.length === 0) {
        return {};
      }

      // Create a pipeline to fetch all locations in a single operation
      const pipeline = this.client.multi();

      // Add get commands for each user location
      for (const userId of userIds) {
        const key = RedisKeyGenerator.userLocation(userId);
        pipeline.get(key);
      }

      // Execute the pipeline
      const results = await pipeline.exec();

      // Process results into a map of userId -> location data
      const locationMap: { [userId: string]: any } = {};

      if (results) {
        results.forEach((result, index) => {
          const userId = userIds[index];
          // ioredis returns [err, result] array for each command
          const locationData = result[1] ? result[1].toString() : null;

          if (locationData) {
            try {
              locationMap[userId] = JSON.parse(locationData);
            } catch (e) {
              this.logger.error(
                `Error parsing location data for user ${userId}: ${e.message}`,
              );
            }
          }
        });
      }

      return locationMap;
    } catch (error) {
      this.logger.error(`Error getting user locations: ${error.message}`);
      return {};
    }
  }

  async markDriverAsActive(driverId: string) {
    try {
      const pipeline = this.client.multi();
      const key = RedisKeyGenerator.driverActive(driverId);

      pipeline.set(key, new Date().toISOString());
      pipeline.expire(key, this.ACTIVE_DRIVER_EXPIRY);
      pipeline.sadd(RedisKeyGenerator.activeDriversSet(), driverId);

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(
        `Error marking driver ${driverId} as active:`,
        error.message,
      );
      return false;
    }
  }

  async markDriverAsInactive(driverId: string) {
    try {
      const pipeline = this.client.multi();
      const key = RedisKeyGenerator.driverActive(driverId);

      pipeline.del(key);
      pipeline.srem(RedisKeyGenerator.activeDriversSet(), driverId);

      await pipeline.exec();

      // Update availability status to busy when driver becomes inactive
      await this.updateDriverAvailability(
        driverId,
        DriverAvailabilityStatus.BUSY,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Error marking driver ${driverId} as inactive:`,
        error.message,
      );
      return false;
    }
  }

  async updateDriverAvailability(
    driverId: string,
    status: DriverAvailabilityStatus,
  ) {
    try {
      // First set the status key
      const pipeline1 = this.client.multi();
      const key = RedisKeyGenerator.driverStatus(driverId);

      pipeline1.set(key, status);
      pipeline1.expire(key, this.ACTIVE_DRIVER_EXPIRY);

      await pipeline1.exec();

      // Update the status in the location data as well
      const locationKey = RedisKeyGenerator.userLocation(driverId);
      const locationData = await this.client.get(locationKey);

      if (locationData) {
        const parsedData = JSON.parse(locationData);
        parsedData.availabilityStatus = status;

        // Use another pipeline for setting the updated location data
        const pipeline2 = this.client.multi();
        pipeline2.set(locationKey, JSON.stringify(parsedData));
        pipeline2.expire(locationKey, this.DRIVER_LOCATION_EXPIRY);

        await pipeline2.exec();
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error updating driver ${driverId} availability:`,
        error.message,
      );
      return false;
    }
  }

  async getDriverAvailability(
    driverId: string,
  ): Promise<DriverAvailabilityStatus> {
    try {
      const key = RedisKeyGenerator.driverStatus(driverId);
      const status = await this.client.get(key);

      return (
        (status as DriverAvailabilityStatus) || DriverAvailabilityStatus.BUSY
      );
    } catch (error) {
      this.logger.error(
        `Error getting driver ${driverId} availability:`,
        error.message,
      );
      return DriverAvailabilityStatus.BUSY;
    }
  }

  async isDriverActive(driverId: string): Promise<boolean> {
    try {
      const key = RedisKeyGenerator.driverActive(driverId);
      const result = await this.client.exists(key);

      return result === 1;
    } catch (error) {
      this.logger.error(
        `Error checking if driver ${driverId} is active:`,
        error.message,
      );
      return false;
    }
  }

  async markCustomerAsActive(customerId: string) {
    try {
      const pipeline = this.client.multi();
      const key = RedisKeyGenerator.customerActive(customerId);

      pipeline.set(key, new Date().toISOString());
      pipeline.expire(key, this.ACTIVE_CUSTOMER_EXPIRY);
      pipeline.sadd(RedisKeyGenerator.activeCustomersSet(), customerId);

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(
        `Error marking customer ${customerId} as active:`,
        error.message,
      );
      return false;
    }
  }

  async markCustomerAsInactive(customerId: string) {
    try {
      const pipeline = this.client.multi();
      const key = RedisKeyGenerator.customerActive(customerId);

      pipeline.del(key);
      pipeline.srem(RedisKeyGenerator.activeCustomersSet(), customerId);

      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error(
        `Error marking customer ${customerId} as inactive:`,
        error.message,
      );
      return false;
    }
  }

  async isCustomerActive(customerId: string): Promise<boolean> {
    try {
      const key = RedisKeyGenerator.customerActive(customerId);
      const result = await this.client.exists(key);

      return result === 1;
    } catch (error) {
      this.logger.error(
        `Error checking if customer ${customerId} is active:`,
        error.message,
      );
      return false;
    }
  }

  async getActiveCustomers(): Promise<string[]> {
    try {
      return await this.client.smembers(RedisKeyGenerator.activeCustomersSet());
    } catch (error) {
      this.logger.error('Error getting active customers:', error.message);
      return [];
    }
  }

  async getActiveDrivers(): Promise<string[]> {
    try {
      return await this.client.smembers(RedisKeyGenerator.activeDriversSet());
    } catch (error) {
      this.logger.error('Error getting active drivers:', error.message);
      return [];
    }
  }

  async checkDriversActiveStatus(
    driverIds: string[],
  ): Promise<{ driverId: string; isActive: boolean }[]> {
    try {
      if (driverIds.length === 0) {
        return [];
      }

      // Use Redis SMISMEMBER command to check multiple members in a single operation
      const activeStatusArray = await this.client.smismember(
        RedisKeyGenerator.activeDriversSet(),
        ...driverIds,
      );

      // Map results (1 = active, 0 = inactive)
      return driverIds.map((driverId, index) => {
        // Ensure we always return a boolean
        const isActive = activeStatusArray
          ? activeStatusArray[index] === 1
          : false;
        return { driverId, isActive };
      });
    } catch (error) {
      this.logger.error(
        `Error checking drivers active status: ${error.message}`,
      );
      return driverIds.map((driverId) => ({ driverId, isActive: false }));
    }
  }

  async findNearbyUsers(
    userType: UserType,
    latitude: number,
    longitude: number,
    radius: number = 5,
    onlyAvailable: boolean = false,
  ): Promise<FindNearbyUsersResult> {
    const geoKey = RedisKeyGenerator.nearbyUsers(userType);

    try {
      const results = await this.client.georadius(
        geoKey,
        longitude,
        latitude,
        radius,
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
            const userData = await this.getUserLocation(userId);

            // Skip if we only want available drivers and this one isn't available
            if (
              onlyAvailable &&
              userType === 'driver' &&
              userData?.availabilityStatus !==
                DriverAvailabilityStatus.AVAILABLE
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
    } catch (error) {
      this.logger.error(`Error finding nearby users:`, error);
      return [];
    }
  }

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

  // Basic Redis operations
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (ttl) {
      return (await this.client.set(key, value, 'PX', ttl)) === 'OK';
    }
    return (await this.client.set(key, value)) === 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async pttl(key: string): Promise<number> {
    return this.client.pttl(key);
  }
}
