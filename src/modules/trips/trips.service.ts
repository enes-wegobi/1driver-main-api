import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisErrors } from 'src/common/redis-errors';
import { RedisException } from 'src/common/redis.exception';
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
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { LocationService } from 'src/redis/services/location.service';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly nearbySearchService: NearbySearchService,
    private readonly tripClient: TripClient,
    private readonly eventService: EventService,
    private readonly customersClient: CustomersClient,
    private readonly activeTripService: ActiveTripService,
    private readonly webSocketService: WebSocketService,
    private readonly locationService: LocationService,
  ) {}

  async getTripById(tripId: string): Promise<any> {
    const trip = await this.tripClient.getTripById(tripId);
    return trip;
  }

  private async getUserActiveTrip(
    userId: string,
    userType: UserType,
  ): Promise<any> {
    try {
      // Get trip ID from Redis in a single operation
      const tripId = await this.activeTripService.getUserActiveTripIfExists(
        userId,
        userType,
      );

      const userTypeStr = userType === UserType.DRIVER ? 'driver' : 'customer';

      if (tripId) {
        this.logger.debug(
          `Found active trip ID for ${userTypeStr} ${userId} in Redis cache: ${tripId}`,
        );

        // Validate the trip ID format
        if (!this.activeTripService.isValidTripId(tripId)) {
          this.logger.warn(
            `Invalid trip ID format in Redis for ${userTypeStr} ${userId}: ${tripId}`,
          );
          await this.activeTripService.removeUserActiveTrip(userId, userType);

          // Fall back to API call based on user type
          if (userType === UserType.DRIVER) {
            return await this.tripClient.getDriverActiveTrip(userId);
          } else {
            return await this.tripClient.getCustomerActiveTrip(userId);
          }
        }

        try {
          // Get the full trip details from the API using the trip ID
          const trip = await this.tripClient.getTripById(tripId);

          // Check if trip exists and is still active
          if (
            !trip ||
            trip.status === 'COMPLETED' ||
            trip.status === 'CANCELLED'
          ) {
            this.logger.warn(
              `Trip ${tripId} for ${userTypeStr} ${userId} is no longer active or doesn't exist`,
            );
            await this.activeTripService.removeUserActiveTrip(userId, userType);

            // Fall back to API call based on user type
            if (userType === UserType.DRIVER) {
              return await this.tripClient.getDriverActiveTrip(userId);
            } else {
              return await this.tripClient.getCustomerActiveTrip(userId);
            }
          }

          // Refresh the TTL since the trip is still active
          await this.activeTripService.refreshUserActiveTripExpiry(
            userId,
            userType,
          );

          return { success: true, trip };
        } catch (apiError) {
          this.logger.error(
            `Error fetching trip ${tripId} from API: ${apiError.message}`,
          );
          await this.activeTripService.removeUserActiveTrip(userId, userType);

          // Fall back to API call based on user type
          if (userType === UserType.DRIVER) {
            return await this.tripClient.getDriverActiveTrip(userId);
          } else {
            return await this.tripClient.getCustomerActiveTrip(userId);
          }
        }
      }

      // If not in Redis, fall back to API call
      let result;
      if (userType === UserType.DRIVER) {
        result = await this.tripClient.getDriverActiveTrip(userId);
      } else {
        result = await this.tripClient.getCustomerActiveTrip(userId);
      }

      // If successful, cache the trip ID
      if (result.success && result.trip) {
        const tripId = result.trip._id || result.trip.id;
        if (tripId) {
          await this.activeTripService.setUserActiveTripId(
            userId,
            userType,
            tripId,
          );
          this.logger.debug(
            `Cached active trip ID for ${userTypeStr} ${userId} in Redis: ${tripId}`,
          );
        }
      }

      return result;
    } catch (error) {
      const userTypeLabel =
        userType === UserType.DRIVER ? 'driver' : 'customer';
      this.logger.error(
        `Error getting ${userTypeLabel} active trip: ${error.message}`,
      );

      // Fall back to API call if Redis fails
      if (userType === UserType.DRIVER) {
        return await this.tripClient.getDriverActiveTrip(userId);
      } else {
        return await this.tripClient.getCustomerActiveTrip(userId);
      }
    }
  }

  async getDriverActiveTrip(driverId: string): Promise<any> {
    return this.getUserActiveTrip(driverId, UserType.DRIVER);
  }

  async getCustomerActiveTrip(customerId: string): Promise<any> {
    return this.getUserActiveTrip(customerId, UserType.CUSTOMER);
  }

  async approveTrip(tripId: string, driverId: string): Promise<any> {
    try {
      const result = await this.tripClient.approveTrip(tripId, driverId);

      if (result.success && result.trip) {
        const tripId = result.trip._id || result.trip.id;

        await this.activeTripService.setUserActiveTripId(
          driverId,
          UserType.DRIVER,
          tripId,
        );


        await this.activeTripService.refreshUserActiveTripExpiry(
          result.trip.customerId,
          UserType.CUSTOMER,
        );

        //notify other drivers
        const remainingDriverIds = result.trip.calledDriverIds.filter(
          (driverId) =>
            !result.trip.rejectedDriverIds.includes(driverId) &&
            driverId !== driverId,
        );

        if (remainingDriverIds.length > 0) {
          await this.notifyTripAlreadyTaken(result.trip, remainingDriverIds);
        }
        //notify other drivers
        const customerId = result.trip.customer.id;
        await this.notifyCustomerDriverAccepted(result.trip, customerId);

        const driverLocation =
          await this.locationService.getUserLocation(driverId);

        if (driverLocation) {
          this.webSocketService.sendToUser(customerId, 'driverLocation', {
            tripId,
            driverId,
            location: driverLocation,
            timestamp: new Date().toISOString(),
          });
        }
      }
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
      if (
        result.trip.calledDriverIds.length ===
        result.trip.rejectedDriverIds.length
      ) {
        const customerId = result.trip.customer.id;
        await this.notifyCustomerDriverNotFound(result.trip, customerId);
      }
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

        // Cache the active trip ID in Redis
        const tripId = result.trip._id || result.trip.id;
        await this.activeTripService.setUserActiveTripId(
          customerId,
          UserType.CUSTOMER,
          tripId,
        );
        this.logger.debug(
          `Cached active trip ID for customer ${customerId} in Redis: ${tripId}`,
        );

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
      const result = await this.tripClient.cancelTrip(userId, userType);

      // If successful, remove the active trip from Redis
      if (result.success) {
        try {
          await this.activeTripService.removeUserActiveTrip(userId, userType);
          this.logger.debug(
            `Removed active trip for ${userType} ${userId} from Redis`,
          );
        } catch (redisError) {
          this.logger.error(
            `Error removing active trip from Redis: ${redisError.message}`,
          );
          // Continue even if Redis operation fails
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error cancelling trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to cancel trip',
      );
    }
  }

  async startPickup(driverId: string): Promise<any> {
    try {
      const { success, trip } = await this.getDriverActiveTrip(driverId);
      if (!success || !trip) {
        throw new BadRequestException('No active trip found');
      }
      const tripId = trip._id || trip.id;
      const result = await this.tripClient.startPickup(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.refreshUserActiveTripExpiry(
          driverId,
          UserType.DRIVER,
        );

        if (result.trip.customerId) {
          await this.activeTripService.refreshUserActiveTripExpiry(
            result.trip.customerId,
            UserType.CUSTOMER,
          );
        }

        await this.notifyCustomerDriverEnRoute(
          result.trip,
          result.trip.customer.id,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error starting pickup: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to start pickup',
      );
    }
  }

  async reachPickup(driverId: string): Promise<any> {
    try {
      const { success, trip } = await this.getDriverActiveTrip(driverId);
      if (!success || !trip) {
        throw new BadRequestException('No active trip found');
      }

      const tripId = trip._id || trip.id;
      const result = await this.tripClient.reachPickup(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.refreshUserActiveTripExpiry(
          driverId,
          UserType.DRIVER,
        );

        if (result.trip.customerId) {
          await this.activeTripService.refreshUserActiveTripExpiry(
            result.trip.customerId,
            UserType.CUSTOMER,
          );
        }

        const customerId = result.trip.customer.id;
        await this.notifyCustomerDriverArrived(result.trip, customerId);
      }

      return result;
    } catch (error) {
      this.logger.error(`Error reaching pickup: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message ||
          'Failed to update pickup reached status',
      );
    }
  }

  async beginTrip(driverId: string): Promise<any> {
    try {
      const { success, trip } = await this.getDriverActiveTrip(driverId);
      if (!success || !trip) {
        throw new BadRequestException('No active trip found');
      }
      const tripId = trip._id || trip.id;
      const result = await this.tripClient.beginTrip(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.refreshUserActiveTripExpiry(
          driverId,
          UserType.DRIVER,
        );

        if (result.trip.customerId) {
          await this.activeTripService.refreshUserActiveTripExpiry(
            result.trip.customerId,
            UserType.CUSTOMER,
          );
        }

        await this.notifyCustomerTripStarted(
          result.trip,
          result.trip.customer.id,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(`Error beginning trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to begin trip',
      );
    }
  }

  async completeTrip(driverId: string): Promise<any> {
    try {
      const { success, trip } = await this.getDriverActiveTrip(driverId);
      if (!success || !trip) {
        throw new BadRequestException('No active trip found');
      }
      const tripId = trip._id || trip.id;
      const result = await this.tripClient.completeTrip(tripId, driverId);

      // If successful, remove the active trip from Redis for both driver and customer
      if (result.success && result.trip) {
        // Remove driver's active trip
        await this.activeTripService.removeUserActiveTrip(
          driverId,
          UserType.DRIVER,
        );
        this.logger.debug(
          `Removed active trip for driver ${driverId} from Redis`,
        );

        // Also remove customer's active trip
        if (result.trip.customerId) {
          await this.activeTripService.removeUserActiveTrip(
            result.trip.customerId,
            UserType.CUSTOMER,
          );
          this.logger.debug(
            `Removed active trip for customer ${result.trip.customerId} from Redis`,
          );
        }

        const customerId = result.trip.customer.id;
        // You could add a notification here if needed
        this.webSocketService.sendToUser(customerId, 'tripCompleted', {
          tripId,
          driverId,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Error completing trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to complete trip',
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

  async notifyCustomerTripStarted(
    trip: any,
    customerId: string,
  ): Promise<void> {
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
