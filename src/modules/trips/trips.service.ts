import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { RedisService } from 'src/redis/redis.service';
import { NearbyDriversResponseDto } from './dto/nearby-drivers-response.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripClient } from 'src/clients/trip/trip.client';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
    private readonly tripClient: TripClient,
  ) {}

  async createTrip(createTripDto: CreateTripDto): Promise<any> {
    const nearbyDrivers = await this.findNearbyDrivers(
      createTripDto.pickup.latitude,
      createTripDto.pickup.longitude,
      5,
    );

    const trip = await this.tripClient.createTrip(createTripDto, nearbyDrivers);

    // TODO: Send FCM notifications to nearby drivers
    return trip;
  }

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

  /**
   * Create a trip room for real-time location sharing
   */
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

    return {
      total: drivers.length,
      drivers: drivers.map((driver) => ({
        driverId: driver.userId,
        distance: driver.distance,
        location: {
          latitude: driver.coordinates.latitude,
          longitude: driver.coordinates.longitude,
        },
        availabilityStatus: driver.availabilityStatus,
        lastUpdated: driver.updatedAt,
      })),
    };
  }
}
