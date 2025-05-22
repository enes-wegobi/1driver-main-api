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
import { EventService } from 'src/modules/event/event.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { NearbySearchService } from 'src/redis/services/nearby-search.service';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { LocationService } from 'src/redis/services/location.service';
import { MapsService } from 'src/clients/maps/maps.service';
import { BatchDistanceRequest } from 'src/clients/maps/maps.interface';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly nearbySearchService: NearbySearchService,
    private readonly tripClient: TripClient,
    private readonly eventService: EventService,
    private readonly customersClient: CustomersClient,
    private readonly activeTripService: ActiveTripService,
    private readonly locationService: LocationService,
    private readonly webSocketService: WebSocketService,
    private readonly mapsService: MapsService,
  ) {}

  async getTripById(tripId: string): Promise<any> {
    return await this.tripClient.getTripById(tripId);
  }
  private async getUserActiveTripId(
    userId: string,
    userType: UserType,
  ): Promise<string> {
    const tripId = await this.activeTripService.getUserActiveTripIfExists(
      userId,
      userType,
    );

    if (tripId) {
      if (!this.activeTripService.isValidTripId(tripId)) {
        return this.getUserActiveTripIdFromDb(userId, userType);
      }
      return tripId;
    }
    return this.getUserActiveTripIdFromDb(userId, userType);
  }

  private async getUserActiveTripIdFromDb(userId: string, userType: UserType) {
    let result;
    if (userType === UserType.DRIVER) {
      result = await this.tripClient.getDriverActiveTrip(userId);
    } else {
      result = await this.tripClient.getCustomerActiveTrip(userId);
    }
    if (result.success && result.trip) {
      const tripId = result.trip._id || result.trip.id;
      if (!tripId) {
        throw new BadRequestException('User have no active trip!!!');
      }
      return tripId;
    }
    throw new BadRequestException('User have no active trip!!!');
  }

  private async getUserActiveTrip(
    userId: string,
    userType: UserType,
  ): Promise<any> {
    try {
      const tripId = await this.activeTripService.getUserActiveTripIfExists(
        userId,
        userType,
      );

      if (tripId) {
        if (!this.activeTripService.isValidTripId(tripId)) {
          await this.activeTripService.removeUserActiveTrip(userId, userType);

          if (userType === UserType.DRIVER) {
            return await this.tripClient.getDriverActiveTrip(userId);
          } else {
            return await this.tripClient.getCustomerActiveTrip(userId);
          }
        }

        try {
          const tripDetails = await this.tripClient.getTripById(tripId);
          //TODO trip statusları buraya taşıyabilirsin
          if (
            !tripDetails.success ||
            !tripDetails.trip ||
            tripDetails.trip.status === 'COMPLETED' ||
            tripDetails.trip.status === 'CANCELLED'
          ) {
            await this.activeTripService.removeUserActiveTrip(userId, userType);

            if (userType === UserType.DRIVER) {
              return await this.tripClient.getDriverActiveTrip(userId);
            } else {
              return await this.tripClient.getCustomerActiveTrip(userId);
            }
          }

          await this.activeTripService.refreshUserActiveTripExpiry(
            userId,
            userType,
          );

          return { success: true, trip: tripDetails.trip };
        } catch (apiError) {
          await this.activeTripService.removeUserActiveTrip(userId, userType);

          if (userType === UserType.DRIVER) {
            return await this.tripClient.getDriverActiveTrip(userId);
          } else {
            return await this.tripClient.getCustomerActiveTrip(userId);
          }
        }
      }

      let result;
      if (userType === UserType.DRIVER) {
        result = await this.tripClient.getDriverActiveTrip(userId);
      } else {
        result = await this.tripClient.getCustomerActiveTrip(userId);
      }

      if (result.success && result.trip) {
        const tripId = result.trip._id || result.trip.id;
        if (tripId) {
          await this.activeTripService.setUserActiveTripId(
            userId,
            userType,
            tripId,
          );
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error getting active trip: ${error.message}`);

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
          await this.eventService.notifyTripAlreadyTaken(
            result.trip,
            remainingDriverIds,
          );
        }
        //notify other drivers
        const customerId = result.trip.customer.id;
        await this.eventService.notifyCustomer(
          result.trip,
          customerId,
          EventType.TRIP_DRIVER_ASSIGNED,
        );
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
      
      if (result.success && result.trip) {
        if (
          result.trip.calledDriverIds.length ===
          result.trip.rejectedDriverIds.length
        ) {
          const customerId = result.trip.customer.id;
          await this.eventService.notifyCustomerDriverNotFound(
            result.trip,
            customerId,
          );
        }
      }
      return result;
    } catch (error) {
      this.logger.error(`Error declining trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to decline trip',
      );
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
      if (result.success) {
        try {
          await this.activeTripService.removeUserActiveTrip(userId, userType);
        } catch (redisError) {}
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
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const result = await this.tripClient.startPickup(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.refreshUserActiveTripExpiry(
          driverId,
          UserType.DRIVER,
        );
        const customerId = result.trip.customer.id;

        await this.activeTripService.refreshUserActiveTripExpiry(
          customerId,
          UserType.CUSTOMER,
        );

        await this.eventService.notifyCustomer(
          result.trip,
          customerId,
          EventType.TRIP_DRIVER_EN_ROUTE,
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

  /**
   * Verifies that a driver is within the specified distance of a target location
   * @param driverId The ID of the driver
   * @param targetLocation The target location coordinates
   * @param maxDistance Maximum allowed distance in meters
   * @param errorMessage Custom error message to show if driver is too far
   */
  private async verifyDriverLocation(
    driverId: string,
    targetLocation: { lat: number; lon: number },
    maxDistance: number = 100, // Default 100 meters
    errorMessage: string = 'You are too far from the target location'
  ): Promise<void> {
    // Get driver's current location
    const driverLocation = await this.locationService.getUserLocation(driverId);
    
    if (!driverLocation) {
      throw new BadRequestException('Driver location not found. Please ensure your location is enabled.');
    }
    
    // Calculate distance between driver and target location
    const distanceRequest: BatchDistanceRequest = {
      referencePoint: targetLocation,
      driverLocations: [
        {
          driverId: driverId,
          coordinates: {
            lat: driverLocation.latitude,
            lon: driverLocation.longitude
          }
        }
      ]
    };
    
    const distanceResult = await this.mapsService.getBatchDistances(distanceRequest);
    
    // Check if driver is close enough to target location
    const driverDistance = distanceResult.results?.[driverId]?.distance ?? Infinity;
    
    if (driverDistance > maxDistance) {
      throw new BadRequestException(
        `${errorMessage} (${Math.round(driverDistance)}m). You must be within ${maxDistance}m.`
      );
    }
  }

  async reachPickup(driverId: string): Promise<any> {
    try {
      // Get driver's active trip ID
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      
      // Get trip details
      const tripDetails = await this.tripClient.getTripById(tripId);
      
      // Validate trip details
      if (!tripDetails.success || !tripDetails.trip) {
        throw new BadRequestException('Failed to retrieve trip details');
      }
      
      // Get pickup location coordinates
      const pickupLocation = tripDetails.trip.route && tripDetails.trip.route.length > 0 ? tripDetails.trip.route[0] : null;
      
      if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lon) {
        throw new BadRequestException('Pickup location not found in trip details');
      }
      
      // Verify driver is at pickup location
      await this.verifyDriverLocation(
        driverId,
        { lat: pickupLocation.lat, lon: pickupLocation.lon },
        100,
        'You are too far from the pickup location'
      );
      
      // Update trip status
      const result = await this.tripClient.reachPickup(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.refreshUserActiveTripExpiry(
          driverId,
          UserType.DRIVER,
        );

        const customerId = result.trip.customer.id;

        await this.activeTripService.refreshUserActiveTripExpiry(
          customerId,
          UserType.CUSTOMER,
        );

        await this.eventService.notifyCustomer(
          result.trip,
          customerId,
          EventType.TRIP_DRIVER_ARRIVED,
        );
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
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const result = await this.tripClient.beginTrip(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.refreshUserActiveTripExpiry(
          driverId,
          UserType.DRIVER,
        );
        const customerId = result.trip.customer.id;
        await this.activeTripService.refreshUserActiveTripExpiry(
          customerId,
          UserType.CUSTOMER,
        );
        await this.eventService.notifyCustomer(
          result.trip,
          customerId,
          EventType.TRIP_STARTED,
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
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const result = await this.tripClient.completeTrip(tripId, driverId);

      if (result.success && result.trip) {
        await this.activeTripService.removeUserActiveTrip(
          driverId,
          UserType.DRIVER,
        );
        await this.activeTripService.removeUserActiveTrip(
          result.trip.customer.id,
          UserType.CUSTOMER,
        );
        //burada müşteriye payment ekranı çıkartmamız lazım
        /*
        this.webSocketService.sendToUser(customerId, 'tripCompleted', {
          tripId,
          driverId,
          timestamp: new Date().toISOString(),
        });
        */
      }

      return result;
    } catch (error) {
      this.logger.error(`Error completing trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to complete trip',
      );
    }
  }
}
