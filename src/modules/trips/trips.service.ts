import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisErrors } from 'src/common/redis-errors';
import { RedisException } from 'src/common/redis.exception';
import { WebSocketService } from 'src/websocket/websocket.service';
import { RedisService } from 'src/redis/redis.service';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { TripClient } from 'src/clients/trip/trip.client';
import { UserType } from 'src/common/user-type.enum';
import {
  NearbyDriverDto as RedisNearbyDriverDto,
  FindNearbyUsersResult,
} from 'src/redis/dto/nearby-user.dto';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { EventService } from 'src/modules/event/event.service';
import { NearbyDriversResponseDto } from './dto';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
    private readonly tripClient: TripClient,
    private readonly eventService: EventService,
  ) {}

  async getTripById(tripId: string): Promise<any> {
    const trip = await this.tripClient.getTripById(tripId);
    return trip;
  }

  async getDriverActiveTrip(driverId: string): Promise<any> {
    const trip = await this.tripClient.getDriverActiveTrip(driverId);
    return trip;
  }

  async getCustomerActiveTrip(customerId: string): Promise<any> {
    const trip = await this.tripClient.getCustomerActiveTrip(customerId);
    return trip;
  }

  async estimate(
    estimateTripDto: EstimateTripDto,
    customerId: string,
  ): Promise<any> {
    return await this.tripClient.estimateTrip(estimateTripDto, customerId);
  }

  async createTripRoom(tripId: string): Promise<boolean> {
    try {
      const trip = await this.getTripById(tripId);

      if (!trip.driverId) {
        throw new BadRequestException('Trip has no assigned driver');
      }

      // Join customer and driver to the trip room
      const server = this.webSocketService.getServer();
      server.in(`user:${trip.customerId}`).socketsJoin(`trip:${tripId}`);
      server.in(`user:${trip.driverId}`).socketsJoin(`trip:${tripId}`);

      this.logger.debug(`Created trip room for trip ${tripId}`);
      return true;
    } catch (error) {
      this.logger.error(`Error creating trip room: ${error.message}`);
      return false;
    }
  }

  async requestDriver(
    tripId: string,
    lat: number,
    lon: number,
    customerId: string,
  ): Promise<any> {
    try {
      const searchRadii = [5, 7, 10];
      let drivers: FindNearbyUsersResult = [];

      for (const radius of searchRadii) {
        this.logger.debug(`Searching for drivers within ${radius}km radius`);
        drivers = await this.redisService.findNearbyAvailableDrivers(
          lat,
          lon,
          radius,
        );

        if (drivers.length > 0) {
          this.logger.debug(
            `Found ${drivers.length} drivers within ${radius}km radius`,
          );
          break;
        }
      }

      if (drivers.length === 0) {
        throw new RedisException(
          RedisErrors.NO_DRIVERS_FOUND.code,
          RedisErrors.NO_DRIVERS_FOUND.message,
        );
      }

      const typedDrivers = drivers as RedisNearbyDriverDto[];
      const driverIds = typedDrivers.map((driver) => driver.userId);

      const result = await this.tripClient.requestDriver(
        tripId,
        customerId,
        driverIds,
      );

      if (result.success && result.trip) {
        await this.eventService.pushCallDriverEvent(result.trip, driverIds);
        this.logger.log(
          `Sent trip request notifications to ${driverIds.length} drivers`,
        );
      }
      return result;
    } catch (error) {
      this.logger.error(`Error requesting driver: ${error.message}`);
      if (error instanceof RedisException) {
        throw error;
      }
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to request driver',
      );
    }
  }

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<NearbyDriversResponseDto> {
    this.logger.debug(
      `Finding nearby drivers at [${latitude}, ${longitude}] with radius ${radius}km`,
    );

    const drivers = await this.redisService.findNearbyAvailableDrivers(
      latitude,
      longitude,
      radius,
    );

    const typedDrivers = drivers as RedisNearbyDriverDto[];

    return {
      total: typedDrivers.length,
      drivers: typedDrivers.map((driver) => ({
        driverId: driver.userId,
        distance: driver.distance,
        location: {
          latitude: driver.coordinates.latitude,
          longitude: driver.coordinates.longitude,
        },
        availabilityStatus:
          driver.availabilityStatus || DriverAvailabilityStatus.AVAILABLE,
        lastUpdated: driver.updatedAt,
      })),
    };
  }

  async getNearbyAvailableDrivers(latitude: number, longitude: number) {
    const drivers = this.redisService.findNearbyUsers(
      UserType.DRIVER,
      latitude,
      longitude,
      5,
      true,
    );
    return drivers;
  }

  async cancelTrip(userId: string, userType: UserType): Promise<any> {
    try {
      this.logger.log(`Cancelling trip for ${userType} ${userId}`);
      return await this.tripClient.cancelTrip(userId, userType);
    } catch (error) {
      this.logger.error(`Error cancelling trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to cancel trip',
      );
    }
  }
}
