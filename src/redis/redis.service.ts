import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { FindNearbyUsersResult } from './dto/nearby-user.dto';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);
  private readonly DRIVER_LOCATION_EXPIRY = 900; // 15 minutes
  private readonly ACTIVE_DRIVER_EXPIRY = 1800; // 30 minutes

  constructor(private configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('redis.url'),
    });

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

  async storeUserLocation(userId: string, userType: string, locationData: any) {
    try {
      const key = `location:user:${userId}`;
      const data = {
        ...locationData,
        userId,
        userType,
        updatedAt: new Date().toISOString(),
      };

      await this.client.set(key, JSON.stringify(data));
      await this.client.expire(key, this.DRIVER_LOCATION_EXPIRY);

      const geoKey = `location:${userType}:geo`;
      await this.client.geoAdd(geoKey, {
        longitude: locationData.longitude,
        latitude: locationData.latitude,
        member: userId,
      });

      // If this is a driver, update active drivers set
      if (userType === 'driver') {
        await this.markDriverAsActive(userId);

        // If availability status is provided, update it
        if (locationData.availabilityStatus) {
          await this.updateDriverAvailability(
            userId,
            locationData.availabilityStatus,
          );
        }
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
    const key = `location:user:${userId}`;
    const locationData = await this.client.get(key);
    return locationData ? JSON.parse(locationData) : null;
  }

  async markDriverAsActive(driverId: string) {
    try {
      const key = `driver:active:${driverId}`;
      await this.client.set(key, new Date().toISOString());
      await this.client.expire(key, this.ACTIVE_DRIVER_EXPIRY);

      // Add to active drivers set
      await this.client.sAdd('drivers:active', driverId);

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
      const key = `driver:active:${driverId}`;
      await this.client.del(key);

      // Remove from active drivers set
      await this.client.sRem('drivers:active', driverId);

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
      const key = `driver:status:${driverId}`;
      await this.client.set(key, status);
      await this.client.expire(key, this.ACTIVE_DRIVER_EXPIRY);

      // Update the status in the location data as well
      const locationKey = `location:user:${driverId}`;
      const locationData = await this.client.get(locationKey);

      if (locationData) {
        const parsedData = JSON.parse(locationData);
        parsedData.availabilityStatus = status;
        await this.client.set(locationKey, JSON.stringify(parsedData));
        await this.client.expire(locationKey, this.DRIVER_LOCATION_EXPIRY);
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
      const key = `driver:status:${driverId}`;
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
      const key = `driver:active:${driverId}`;
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

  async getActiveDrivers(): Promise<string[]> {
    try {
      return await this.client.sMembers('drivers:active');
    } catch (error) {
      this.logger.error('Error getting active drivers:', error.message);
      return [];
    }
  }

  async findNearbyUsers(
    userType: UserType,
    latitude: number,
    longitude: number,
    radius: number = 5,
    onlyAvailable: boolean = false,
  ): Promise<FindNearbyUsersResult> {
    const geoKey = `location:${userType}:geo`;

    try {
      const results = await this.client.sendCommand([
        'GEORADIUS',
        geoKey,
        longitude.toString(),
        latitude.toString(),
        radius.toString(),
        'km',
        'WITHDIST',
        'WITHCOORD',
      ]);

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
}
