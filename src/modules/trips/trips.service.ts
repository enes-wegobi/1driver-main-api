import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisErrors } from 'src/common/redis-errors';
import { RedisException } from 'src/common/redis.exception';
import { WebSocketService } from 'src/websocket/websocket.service';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { TripClient } from 'src/clients/trip/trip.client';
import { UserType } from 'src/common/user-type.enum';
import {
  NearbyDriverDto as RedisNearbyDriverDto,
  FindNearbyUsersResult,
} from 'src/redis/dto/nearby-user.dto';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { EventService } from 'src/modules/event/event.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { NearbyDriversResponseDto } from './dto';
import { NearbySearchService } from 'src/redis/services/nearby-search.service';
import { CustomersClient } from 'src/clients/customer/customers.client';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly nearbySearchService: NearbySearchService,
    private readonly tripClient: TripClient,
    private readonly eventService: EventService,
    private readonly customersClient: CustomersClient,
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

  async approveTrip(tripId: string, driverId: string): Promise<any> {
    try {
      this.logger.log(`Driver ${driverId} approving trip ${tripId}`);
      const result = await this.tripClient.approveTrip(tripId, driverId);
      return result;
    } catch (error) {
      this.logger.error(`Error approving trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to approve trip',
      );
    }
  }

  async declineTrip(tripId: string, driverId: string): Promise<any> {
    try {
      this.logger.log(`Driver ${driverId} declining trip ${tripId}`);
      const result = await this.tripClient.declineTrip(tripId, driverId);
      return result;
    } catch (error) {
      this.logger.error(`Error declining trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to decline trip',
      );
    }
  }

  async notifyTripAlreadyTaken(trip: any, driverIds: string[]): Promise<void> {
    try {
      this.logger.log(
        `Notifying ${driverIds.length} drivers that trip ${trip._id || trip.id} has been taken`,
      );
      await this.eventService.notifyTripAlreadyTaken(trip, driverIds);
    } catch (error) {
      this.logger.error(`Error notifying drivers: ${error.message}`);
    }
  }

  async notifyCustomerDriverAccepted(
    trip: any,
    customerId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Notifying customer ${customerId} that trip ${trip._id || trip.id} has been approved`,
      );
      await this.eventService.notifyCustomer(
        trip,
        customerId,
        EventType.TRIP_DRIVER_ASSIGNED,
      );
    } catch (error) {
      this.logger.error(`Error notifying customer: ${error.message}`);
    }
  }

  async notifyCustomerDriverNotFound(
    trip: any,
    customerId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Notifying customer ${customerId} that no drivers were found for trip ${trip._id || trip.id}`,
      );
      await this.eventService.notifyCustomerDriverNotFound(trip, customerId);
    } catch (error) {
      this.logger.error(`Error notifying customer: ${error.message}`);
    }
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
        drivers = await this.nearbySearchService.findNearbyAvailableDrivers(
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
        await this.customersClient.setActiveTrip(customerId, {
          tripId: result.trip._id,
        });

        await this.eventService.notifyNewTripRequest(result.trip, driverIds);
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

    const drivers = await this.nearbySearchService.findNearbyAvailableDrivers(
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
    const drivers = this.nearbySearchService.findNearbyUsers(
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

  async startPickup(tripId: string, driverId: string): Promise<any> {
    try {
      this.logger.log(`Driver ${driverId} starting pickup for trip ${tripId}`);
      const result = await this.tripClient.startPickup(tripId, driverId);
      return result;
    } catch (error) {
      this.logger.error(`Error starting pickup: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to start pickup',
      );
    }
  }

  async reachPickup(tripId: string, driverId: string): Promise<any> {
    try {
      this.logger.log(`Driver ${driverId} reached pickup for trip ${tripId}`);
      const result = await this.tripClient.reachPickup(tripId, driverId);
      return result;
    } catch (error) {
      this.logger.error(`Error reaching pickup: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message ||
          'Failed to update pickup reached status',
      );
    }
  }

  async beginTrip(tripId: string, driverId: string): Promise<any> {
    try {
      this.logger.log(`Driver ${driverId} beginning trip ${tripId}`);
      const result = await this.tripClient.beginTrip(tripId, driverId);
      return result;
    } catch (error) {
      this.logger.error(`Error beginning trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to begin trip',
      );
    }
  }

  async notifyCustomerDriverEnRoute(
    trip: any,
    customerId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Notifying customer ${customerId} that driver is on the way for trip ${trip._id || trip.id}`,
      );
      await this.eventService.notifyCustomer(
        trip,
        customerId,
        EventType.TRIP_DRIVER_EN_ROUTE,
      );
    } catch (error) {
      this.logger.error(`Error notifying customer: ${error.message}`);
    }
  }

  async notifyCustomerDriverArrived(
    trip: any,
    customerId: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Notifying customer ${customerId} that driver has arrived for trip ${trip._id || trip.id}`,
      );
      await this.eventService.notifyCustomer(
        trip,
        customerId,
        EventType.TRIP_DRIVER_ARRIVED,
      );
    } catch (error) {
      this.logger.error(`Error notifying customer: ${error.message}`);
    }
  }

  async notifyCustomerTripStarted(trip: any, customerId: string): Promise<void> {
    try {
      this.logger.log(
        `Notifying customer ${customerId} that trip ${trip._id || trip.id} has begun`,
      );
      await this.eventService.notifyCustomer(
        trip,
        customerId,
        EventType.TRIP_STARTED,
      );
    } catch (error) {
      this.logger.error(`Error notifying customer: ${error.message}`);
    }
  }
}
