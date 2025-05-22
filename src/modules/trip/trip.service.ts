import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TripRepository } from './trip.repository';
import { CreateTripDto } from './dto/create-trip.dto';
import { TripDocument } from './schemas/trip.schema';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripStateService } from './trip-state.service';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { LockService } from 'src/common/lock/lock.service';
import { TripErrors } from './exceptions/trip-errors';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { UserType } from 'src/common/user-type.enum';
import { NearbySearchService } from 'src/redis/services/nearby-search.service';
import { EstimateTripDto } from '../trips/dto';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { ConfigService } from 'src/config/config.service';
import { MapsService } from 'src/clients/maps/maps.service';
import { EventService } from '../event/event.service';
import { RedisException } from 'src/common/redis.exception';
import { RedisErrors } from 'src/common/redis-errors';
import {
  NearbyDriverDto as RedisNearbyDriverDto,
  FindNearbyUsersResult,
} from 'src/redis/dto/nearby-user.dto';
import { EventType } from '../event/enum/event-type.enum';
import { LocationService } from 'src/redis/services/location.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { BatchDistanceRequest } from 'src/clients/maps/maps.interface';

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    private readonly tripRepository: TripRepository,
    private readonly lockService: LockService,
    private readonly tripStateService: TripStateService,
    private readonly customersClient: CustomersClient,
    private readonly driversClient: DriversClient,
    private readonly activeTripService: ActiveTripService,
    private readonly nearbySearchService: NearbySearchService,
    private readonly configService: ConfigService,
    private readonly mapsService: MapsService,
    private readonly eventService: EventService,
    private readonly locationService: LocationService,
    private readonly webSocketService: WebSocketService,
  ) {}

  async estimate(
    estimateTripDto: EstimateTripDto,
    customerId: string,
  ): Promise<any> {
    const distanceMatrix = await this.mapsService.getDistanceMatrix(
      estimateTripDto.route,
    );

    if (
      !distanceMatrix.success ||
      !distanceMatrix.duration ||
      !distanceMatrix.distance
    ) {
      return {
        success: false,
        message: distanceMatrix.message || 'Failed to calculate distance',
      };
    }

    // Calculate estimated cost based on duration
    const durationInMinutes = distanceMatrix.duration.value / 60;
    const costPerMinute = this.configService.tripCostPerMinute;
    const estimatedCost =
      Math.round(durationInMinutes * costPerMinute * 100) / 100;

    // Create a trip record
    const trip = await this.createTrip(
      {
        status: TripStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
        route: estimateTripDto.route,
        estimatedDistance: distanceMatrix.distance.value,
        estimatedDuration: distanceMatrix.duration.value,
        estimatedCost,
      },
      customerId,
    );

    return {
      success: true,
      trip: trip,
    };
  }

  private async createTrip(
    tripData: CreateTripDto,
    customerId: string,
  ): Promise<TripDocument> {
    const customer = await this.customersClient.findOne(customerId, [
      'name',
      'surname',
      'rate',
      'vehicle.transmissionType',
      'vehicle.licensePlate',
      'photoUrl',
    ]);
    const trip = {
      ...tripData,
      customer: {
        id: customer._id,
        name: customer.name,
        surname: customer.surname,
        rate: customer.rate,
        Vehicle: {
          transmissionType: customer.vehicle.transmissionType,
          licensePlate: customer.vehicle.licensePlate,
        },
        photoUrl: customer.photoUrl,
      },
    };
    return this.tripRepository.createTrip(trip);
  }

  async requestDriver(
    tripId: string,
    lat: number,
    lon: number,
    customerId: string,
  ): Promise<any> {
    try {
      const driverIds = await this.searchDriver(lat, lon);

      const trip = await this.findById(tripId);
      if (!trip) {
        return { success: false, message: TripErrors.TRIP_NOT_FOUND.message };
      }

      const statusValidation = this.tripStateService.validateMultipleStatuses(
        trip.status,
        [TripStatus.DRAFT, TripStatus.DRIVER_NOT_FOUND],
      );

      if (!statusValidation.valid) {
        return {
          success: false,
          message:
            statusValidation.message || TripErrors.TRIP_INVALID_STATUS.message,
        };
      }

      const customerActiveTripResult =
        await this.findActiveByCustomerId(customerId);

      if (
        customerActiveTripResult.trip &&
        customerActiveTripResult.trip._id &&
        customerActiveTripResult.trip._id !== tripId
      ) {
        return {
          success: false,
          message: `Customer already has an active trip with ID: ${customerActiveTripResult.trip._id}`,
        };
      }

      const currentRetryCount = trip.callRetryCount || 0;
      const newRetryCount = currentRetryCount + 1;

      const transitionValidation = this.tripStateService.canTransition(
        trip.status,
        TripStatus.WAITING_FOR_DRIVER,
      );

      if (!transitionValidation.valid) {
        return {
          success: false,
          message:
            transitionValidation.message ||
            TripErrors.TRIP_INVALID_STATUS.message,
        };
      }

      const updateData: UpdateTripDto = {
        status: TripStatus.WAITING_FOR_DRIVER,
        calledDriverIds: driverIds,
        callStartTime: new Date(),
        callRetryCount: newRetryCount,
      };

      const updatedTrip = await this.tripRepository.findByIdAndUpdate(
        tripId,
        updateData,
      );

      if (!updatedTrip) {
        return { success: false, message: 'Failed to update trip status' };
      }

      await this.customersClient.setActiveTrip(customerId, {
        tripId,
      });

      await this.activeTripService.setUserActiveTripId(
        customerId,
        UserType.CUSTOMER,
        tripId,
      );

      await this.eventService.notifyNewTripRequest(updatedTrip, driverIds);

      return { success: true, trip: updatedTrip };
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

  private async searchDriver(lat: number, lon: number) {
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
    return driverIds;
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

  async getCustomerActiveTrip(customerId: string): Promise<any> {
    return this.getUserActiveTrip(customerId, UserType.CUSTOMER);
  }

  async getDriverActiveTrip(driverId: string): Promise<any> {
    return this.getUserActiveTrip(driverId, UserType.DRIVER);
  }

  private async getUserActiveTripIdFromDb(userId: string, userType: UserType) {
    let result;
    if (userType === UserType.DRIVER) {
      result = await this.findActiveByDriverId(userId);
    } else {
      result = await this.findActiveByCustomerId(userId);
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
            return await this.findActiveByDriverId(userId);
          } else {
            return await this.findActiveByCustomerId(userId);
          }
        }

        try {
          const tripDetails = await this.findById(tripId);
          //TODO trip statusları buraya taşıyabilirsin
          if (
            !tripDetails ||
            tripDetails.status === TripStatus.COMPLETED ||
            tripDetails.status === TripStatus.CANCELLED
          ) {
            await this.activeTripService.removeUserActiveTrip(userId, userType);

            if (userType === UserType.DRIVER) {
              return await this.findActiveByDriverId(userId);
            } else {
              return await this.findActiveByCustomerId(userId);
            }
          }

          await this.activeTripService.refreshUserActiveTripExpiry(
            userId,
            userType,
          );

          return { success: true, trip: tripDetails };
        } catch (apiError) {
          await this.activeTripService.removeUserActiveTrip(userId, userType);

          if (userType === UserType.DRIVER) {
            return await this.findActiveByDriverId(userId);
          } else {
            return await this.findActiveByCustomerId(userId);
          }
        }
      }

      let result;
      if (userType === UserType.DRIVER) {
        result = await this.findActiveByDriverId(userId);
      } else {
        result = await this.findActiveByCustomerId(userId);
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
        return await this.findActiveByDriverId(userId);
      } else {
        return await this.findActiveByCustomerId(userId);
      }
    }
  }

  async declineTrip(tripId: string, driverId: string): Promise<any> {
    try {
      const trip = await this.findById(tripId);
      if (!trip) {
        return { success: false, message: TripErrors.TRIP_NOT_FOUND.message };
      }

      const statusValidation = this.tripStateService.validateStatus(
        trip.status,
        TripStatus.WAITING_FOR_DRIVER,
      );
      if (!statusValidation.valid) {
        return {
          success: false,
          message:
            statusValidation.message || TripErrors.TRIP_INVALID_STATUS.message,
        };
      }

      const rejectedDriverIds = trip.rejectedDriverIds || [];

      if (!rejectedDriverIds.includes(driverId)) {
        rejectedDriverIds.push(driverId);
      }

      // Check if all called drivers are now rejected
      let newStatus = trip.status;
      if (trip.calledDriverIds && trip.calledDriverIds.length > 0) {
        const allDriversRejected = trip.calledDriverIds.every((id) =>
          rejectedDriverIds.includes(id),
        );

        if (allDriversRejected) {
          newStatus = TripStatus.DRIVER_NOT_FOUND;
        }
      }

      const updatedTrip = await this.tripRepository.findByIdAndUpdate(tripId, {
        rejectedDriverIds,
        status: newStatus,
      });

      if (!updatedTrip) {
        return { success: false, message: 'Failed to update trip' };
      }

      if (
        updatedTrip.calledDriverIds.length ===
        updatedTrip.rejectedDriverIds.length
      ) {
        const customerId = updatedTrip.customer.id;
        await this.eventService.notifyCustomerDriverNotFound(
          updatedTrip,
          customerId,
        );
      }

      return { success: true, trip: updatedTrip };
    } catch (error) {
      this.logger.error(`Error declining trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to decline trip',
      );
    }
  }

  async findById(tripId: string) {
    return this.tripRepository.findById(tripId);
  }

  async findActiveByCustomerId(customerId: string) {
    const customer = await this.customersClient.findOne(customerId, [
      'activeTrip',
    ]);
    if (!customer.activeTrip) {
      return {
        success: false,
        message: 'No active trip found for this customer',
      };
    }
    const trip = await this.findById(customer.activeTrip);

    if (!trip) {
      return {
        success: false,
        message: 'No active trip found for this customer',
      };
    }

    return {
      success: true,
      trip,
    };
  }

  async findActiveByDriverId(driverId: string) {
    const driver = await this.driversClient.findOne(driverId, ['activeTrip']);
    if (!driver.activeTrip) {
      return {
        success: false,
        message: 'No active trip found for this driver',
      };
    }
    const trip = await this.findById(driver.activeTrip);

    if (!trip) {
      return {
        success: false,
        message: 'No active trip found for this driver',
      };
    }

    return {
      success: true,
      trip,
    };
  }

  async updateTrip(
    tripId: string,
    tripData: UpdateTripDto,
  ): Promise<{ success: boolean; trip?: TripDocument; message?: string }> {
    return this.lockService.executeWithLock<{
      success: boolean;
      trip?: TripDocument;
      message?: string;
    }>(
      `trip:${tripId}`,
      async () => {
        const trip = await this.findById(tripId);
        if (!trip) {
          return { success: false, message: TripErrors.TRIP_NOT_FOUND.message };
        }

        if (tripData.status && tripData.status !== trip.status) {
          const transitionValidation = this.tripStateService.canTransition(
            trip.status,
            tripData.status,
          );
          if (!transitionValidation.valid) {
            return {
              success: false,
              message:
                transitionValidation.message ||
                TripErrors.TRIP_INVALID_STATUS.message,
            };
          }
        }

        const updatedTrip = await this.tripRepository.findByIdAndUpdate(
          tripId,
          tripData,
        );

        if (!updatedTrip) {
          return { success: false, message: 'Failed to update trip' };
        }

        return { success: true, trip: updatedTrip };
      },
      TripErrors.TRIP_LOCKED.message,
    );
  }

  async arrivePickup(driverId: string): Promise<any> {
    try {
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const tripDetails = await this.findById(tripId);

      if (!tripDetails) {
        throw new BadRequestException('Failed to retrieve trip details');
      }

      const pickupLocation =
        tripDetails.route && tripDetails.route.length > 0
          ? tripDetails.route[0]
          : null;

      if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lon) {
        throw new BadRequestException(
          'Pickup location not found in trip details',
        );
      }

      await this.verifyDriverLocation(
        driverId,
        { lat: pickupLocation.lat, lon: pickupLocation.lon },
        100,
        'You are too far from the pickup location',
      );

      const result = await this.updateTripStatus(
        tripId,
        TripStatus.ARRIVED_AT_PICKUP,
      );

      if (result.success && result.trip) {
        const customerId = result.trip.customer.id;
        await this.refreshUsersTripExpiry(driverId, customerId);
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

  async refreshUsersTripExpiry(driverId: string, customerId: string) {
    await this.activeTripService.refreshUserActiveTripExpiry(
      driverId,
      UserType.DRIVER,
    );
    await this.activeTripService.refreshUserActiveTripExpiry(
      customerId,
      UserType.CUSTOMER,
    );
  }

  async reachPickup1(tripId: string) {
    const result = await this.updateTripStatus(
      tripId,
      TripStatus.ARRIVED_AT_PICKUP,
    );

    if (!result.success || !result.trip) {
      return {
        success: false,
        message:
          result.message || 'Failed to update trip status to arrived at pickup',
      };
    }

    return {
      success: true,
      trip: result.trip,
    };
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
    errorMessage: string = 'You are too far from the target location',
  ): Promise<void> {
    // Get driver's current location
    const driverLocation = await this.locationService.getUserLocation(driverId);

    if (!driverLocation) {
      throw new BadRequestException(
        'Driver location not found. Please ensure your location is enabled.',
      );
    }

    // Calculate distance between driver and target location
    const distanceRequest: BatchDistanceRequest = {
      referencePoint: targetLocation,
      driverLocations: [
        {
          driverId: driverId,
          coordinates: {
            lat: driverLocation.latitude,
            lon: driverLocation.longitude,
          },
        },
      ],
    };

    const distanceResult =
      await this.mapsService.getBatchDistances(distanceRequest);

    // Check if driver is close enough to target location
    const driverDistance =
      distanceResult.results?.[driverId]?.distance ?? Infinity;

    if (driverDistance > maxDistance) {
      throw new BadRequestException(
        `${errorMessage} (${Math.round(driverDistance)}m). You must be within ${maxDistance}m.`,
      );
    }
  }

  async startPickup(driverId: string): Promise<any> {
    try {
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const updatedTripResult = await this.updateTripStatus(
        tripId,
        TripStatus.DRIVER_ON_WAY_TO_PICKUP,
      );

      if (updatedTripResult.success && updatedTripResult.trip) {
        const customerId = updatedTripResult.trip.customer.id;
        await this.refreshUsersTripExpiry(driverId, customerId);

        await this.eventService.notifyCustomer(
          updatedTripResult.trip,
          customerId,
          EventType.TRIP_DRIVER_EN_ROUTE,
        );
      }

      return updatedTripResult;
    } catch (error) {
      this.logger.error(`Error starting pickup: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to start pickup',
      );
    }
  }

  async rejectDriver(
    tripId: string,
    driverId: string,
  ): Promise<{ success: boolean; trip?: TripDocument; message?: string }> {
    const trip = await this.findById(tripId);
    if (!trip) {
      return { success: false, message: TripErrors.TRIP_NOT_FOUND.message };
    }

    const statusValidation = this.tripStateService.validateStatus(
      trip.status,
      TripStatus.WAITING_FOR_DRIVER,
    );
    if (!statusValidation.valid) {
      return {
        success: false,
        message:
          statusValidation.message || TripErrors.TRIP_INVALID_STATUS.message,
      };
    }

    const rejectedDriverIds = trip.rejectedDriverIds || [];

    if (!rejectedDriverIds.includes(driverId)) {
      rejectedDriverIds.push(driverId);
    }

    // Check if all called drivers are now rejected
    let newStatus = trip.status;
    if (trip.calledDriverIds && trip.calledDriverIds.length > 0) {
      const allDriversRejected = trip.calledDriverIds.every((id) =>
        rejectedDriverIds.includes(id),
      );

      if (allDriversRejected) {
        newStatus = TripStatus.DRIVER_NOT_FOUND;
      }
    }

    const updatedTrip = await this.tripRepository.findByIdAndUpdate(tripId, {
      rejectedDriverIds,
      status: newStatus,
    });

    if (!updatedTrip) {
      return { success: false, message: 'Failed to update trip' };
    }

    return { success: true, trip: updatedTrip };
  }

  async approveTrip(tripId: string, driverId: string): Promise<any> {
    try {
      const trip = await this.findById(tripId);
      if (!trip) {
        return { success: false, message: TripErrors.TRIP_NOT_FOUND.message };
      }
      const driver = await this.driversClient.findOne(driverId, [
        'name',
        'surname',
        'rate',
        'photoUrl',
      ]);

      const transitionValidation = this.tripStateService.canTransition(
        trip.status,
        TripStatus.APPROVED,
      );
      if (!transitionValidation.valid) {
        return {
          success: false,
          message:
            transitionValidation.message ||
            TripErrors.TRIP_INVALID_STATUS.message,
        };
      }
      /*
    const driverActiveTripResult = await this.findActiveByDriverId(driverId);
    if (driverActiveTripResult.trip) {
      return {
        success: false,
        message: `Driver already has an active trip with ID: ${driverActiveTripResult.trip._id}`,
      };
    }
    */
      const updatedTrip = await this.tripRepository.findByIdAndUpdate(tripId, {
        driver: {
          id: driver._id,
          name: driver.name,
          surname: driver.surname,
          photoUrl: driver.photoUrl,
          rate: driver.rate,
        },
        status: TripStatus.APPROVED,
        tripStartTime: new Date(),
      });

      if (!updatedTrip) {
        return { success: false, message: 'Failed to approve trip' };
      }

      await this.driversClient.setActiveTrip(driverId, {
        tripId: updatedTrip._id,
      });

      await this.activeTripService.setUserActiveTripId(
        driverId,
        UserType.DRIVER,
        tripId,
      );

      const customerId = updatedTrip.customer.id;

      await this.activeTripService.refreshUserActiveTripExpiry(
        customerId,
        UserType.CUSTOMER,
      );

      //notify other drivers
      const remainingDriverIds = updatedTrip.calledDriverIds.filter(
        (driverId) =>
          !updatedTrip.rejectedDriverIds.includes(driverId) &&
          driverId !== driverId,
      );

      if (remainingDriverIds.length > 0) {
        await this.eventService.notifyTripAlreadyTaken(
          updatedTrip,
          remainingDriverIds,
        );
      }

      await this.eventService.notifyCustomer(
        updatedTrip,
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

      return { success: true, trip: updatedTrip };
    } catch (error) {
      this.logger.error(`Error approving trip: ${error.message}`);
      throw new BadRequestException(
        error.response?.data?.message || 'Failed to approve trip',
      );
    }
  }

  /**
   * Update trip status
   * @param tripId Trip ID
   * @param newStatus New status to set
   * @returns Object with success flag, updated trip, and optional message
   */
  async updateTripStatus(
    tripId: string,
    newStatus: TripStatus,
  ): Promise<{ success: boolean; trip?: TripDocument; message?: string }> {
    const trip = await this.findById(tripId);
    if (!trip) {
      return { success: false, message: TripErrors.TRIP_NOT_FOUND.message };
    }

    // Only allow transitions to the specific statuses we want
    if (
      ![
        TripStatus.DRIVER_ON_WAY_TO_PICKUP,
        TripStatus.ARRIVED_AT_PICKUP,
        TripStatus.TRIP_IN_PROGRESS,
        TripStatus.COMPLETED, // Added COMPLETED status
      ].includes(newStatus)
    ) {
      return {
        success: false,
        message: `Cannot update to status ${newStatus}. Only DRIVER_ON_WAY_TO_PICKUP, ARRIVED_AT_PICKUP, TRIP_IN_PROGRESS, and COMPLETED are allowed.`,
      };
    }

    // Validate the status transition
    const transitionValidation = this.tripStateService.canTransition(
      trip.status,
      newStatus,
    );
    if (!transitionValidation.valid) {
      return {
        success: false,
        message:
          transitionValidation.message ||
          TripErrors.TRIP_INVALID_STATUS.message,
      };
    }

    // Set trip end time if status is COMPLETED
    if (newStatus === TripStatus.COMPLETED) {
      const updatedTrip = await this.tripRepository.findByIdAndUpdate(tripId, {
        status: newStatus,
        tripEndTime: new Date(), // Set the end time when trip is completed
      });

      if (!updatedTrip) {
        return { success: false, message: 'Failed to update trip status' };
      }

      return { success: true, trip: updatedTrip };
    }

    // Update the trip status for other statuses
    const updatedTrip = await this.tripRepository.findByIdAndUpdate(tripId, {
      status: newStatus,
    });

    if (!updatedTrip) {
      return { success: false, message: 'Failed to update trip status' };
    }

    return { success: true, trip: updatedTrip };
  }

  async startTrip(driverId: string): Promise<any> {
    try {
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const result = await this.updateTripStatus(
        tripId,
        TripStatus.TRIP_IN_PROGRESS,
      );

      if (result.success && result.trip) {
        const customerId = result.trip.customer.id;
        await this.refreshUsersTripExpiry(driverId, customerId);

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

  async arrivedStop(driverId: string): Promise<any> {
    try {
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const result = await this.updateTripStatus(tripId, TripStatus.COMPLETED);

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
