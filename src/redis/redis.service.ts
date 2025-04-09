import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType, GeoReplyWith } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('redis.url'),
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
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
      await this.client.expire(key, 900);

      const geoKey = `location:${userType}:geo`;
      await this.client.geoAdd(geoKey, {
        longitude: locationData.longitude,
        latitude: locationData.latitude,
        member: userId,
      });

      return true;
    } catch (error) {
      console.error(
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

  async findNearbyUsers(
    userType: string,
    latitude: number,
    longitude: number,
    radius: number = 5,
  ) {
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
      console.error(`Error finding nearby users:`, error);
      return [];
    }
  }
}
