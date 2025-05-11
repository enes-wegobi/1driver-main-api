import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { RedisService } from 'src/redis/redis.service';
import { NearbyDriversResponseDto } from './dto/nearby-drivers-response.dto';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripClient } from 'src/clients/trip/trip.client';
import { UserType } from 'src/common/user-type.enum';
import { NearbyDriverDto as RedisNearbyDriverDto } from 'src/redis/dto/nearby-user.dto';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
    private readonly tripClient: TripClient,
  ) {}

  async getTripById(tripId: string): Promise<any> {
    const trip = await this.tripClient.getTripById(tripId);
    return trip;
  }

  async updateTripStatus(updateDto: UpdateTripStatusDto): Promise<any> {
    const trip = await this.tripClient.updateTripStatus(updateDto);
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
      const drivers = await this.redisService.findNearbyAvailableDrivers(
        lat,
        lon,
        5,
      );

      const typedDrivers = drivers as RedisNearbyDriverDto[];
      const driverIds = typedDrivers.map((driver) => driver.userId);

      const result = await this.tripClient.requestDriver(
        tripId,
        customerId,
        driverIds,
      );
      return result;
    } catch (error) {
      this.logger.error(`Error requesting driver: ${error.message}`);
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
}
