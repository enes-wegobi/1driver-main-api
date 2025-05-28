import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TripRepository } from '../repositories/trip.repository';
import { CreateTripDto } from '../dto/create-trip.dto';
import { TripDocument } from '../schemas/trip.schema';
import { UpdateTripDto } from '../dto/update-trip.dto';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { LockService } from 'src/common/lock/lock.service';
import { TripErrors } from '../exceptions/trip-errors';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { UserType } from 'src/common/user-type.enum';
import { NearbySearchService } from 'src/redis/services/nearby-search.service';
import { EstimateTripDto } from '../../trips/dto';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { ConfigService } from 'src/config/config.service';
import { MapsService } from 'src/clients/maps/maps.service';
import { EventService } from '../../event/event.service';
import { RedisException } from 'src/common/redis.exception';
import { RedisErrors } from 'src/common/redis-errors';
import {
  NearbyDriverDto as RedisNearbyDriverDto,
  FindNearbyUsersResult,
} from 'src/redis/dto/nearby-user.dto';
import { EventType } from '../../event/enum/event-type.enum';
import { LocationService } from 'src/redis/services/location.service';
import { BatchDistanceRequest } from 'src/clients/maps/maps.interface';
import { TripStateService } from './trip-state.service';
import { DriverPenaltyService } from './driver-penalty.service';
import { PaymentMethodService } from '../../payments/services/payment-method.service';

export interface TripOperationResult {
  success: boolean;
  trip?: TripDocument;
  message?: string;
}

export interface ActiveTripResult {
  success: boolean;
  trip?: TripDocument;
  message?: string;
}

export interface LocationCoords {
  lat: number;
  lon: number;
}

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    private readonly tripRepository: TripRepository,
    private readonly lockService: LockService,
    private readonly tripStateService: TripStateService,
    private readonly driverPenaltyService: DriverPenaltyService,
    private readonly customersClient: CustomersClient,
    private readonly driversClient: DriversClient,
    private readonly activeTripService: ActiveTripService,
    private readonly nearbySearchService: NearbySearchService,
    private readonly configService: ConfigService,
    private readonly mapsService: MapsService,
    private readonly eventService: EventService,
    private readonly locationService: LocationService,
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  // ================================
  // PUBLIC API METHODS
  // ================================

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

    const estimatedCost = this.calculateEstimatedCost(
      distanceMatrix.duration.value,
    );
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

    return { success: true, trip };
  }

  async requestDriver(
    tripId: string,
    lat: number,
    lon: number,
    customerId: string,
  ): Promise<any> {
    return this.lockService.executeWithLock(
      `trip:${tripId}`,
      async () => {
        return this.executeWithErrorHandling('requesting driver', async () => {
          const trip = await this.validateTripForRequest(tripId, customerId);
          
          // Validate customer has a payment method before searching for drivers
          await this.validateCustomerHasPaymentMethod(customerId);
          
          const driverIds = await this.searchDriver(lat, lon);

          const updateData = this.buildDriverRequestUpdateData(
            driverIds,
            trip.callRetryCount,
          );
          const updatedTrip = await this.updateTripWithData(tripId, updateData);

          await this.setUserActiveTrip(customerId, UserType.CUSTOMER, tripId);
          await this.eventService.notifyNewTripRequest(updatedTrip, driverIds);

          return { success: true, trip: updatedTrip };
        });
      },
      'Trip is currently being processed by another request. Please try again.',
      45000, // 45 seconds timeout
      2, // 2 retries
    );
  }

  async getCustomerActiveTrip(customerId: string): Promise<ActiveTripResult> {
    return this.getUserActiveTrip(customerId, UserType.CUSTOMER);
  }

  async getDriverActiveTrip(driverId: string): Promise<ActiveTripResult> {
    return this.getUserActiveTrip(driverId, UserType.DRIVER);
  }

  async declineTrip(tripId: string, driverId: string): Promise<any> {
    return this.lockService.executeWithLock(
      `trip:${tripId}`,
      async () => {
        return this.executeWithErrorHandling('declining trip', async () => {
          return this.handleDriverRejection(tripId, driverId);
        });
      },
      'Trip is currently being processed by another request. Please try again.',
      30000, // 30 seconds timeout
      1, // 1 retry
    );
  }

  async approveTrip(tripId: string, driverId: string): Promise<any> {
    return this.lockService.executeWithLock(
      `trip:${tripId}`,
      async () => {
        return this.executeWithErrorHandling('approving trip', async () => {
          const trip = await this.validateTripExists(tripId);
          const driver = await this.driversClient.findOne(driverId, [
            'name',
            'surname',
            'rate',
            'photoUrl',
          ]);

          this.validateStatusTransition(trip.status, TripStatus.APPROVED);

          const updatedTrip = await this.updateTripWithDriverInfo(
            tripId,
            driver,
          );
          await this.handleTripApproval(updatedTrip, driverId);

          return { success: true, trip: updatedTrip };
        });
      },
      'Trip is currently being processed by another request. Please try again.',
      60000, // 60 seconds timeout
      3, // 3 retries
    );
  }

  async startPickup(driverId: string): Promise<any> {
    return this.executeDriverTripAction(
      driverId,
      TripStatus.DRIVER_ON_WAY_TO_PICKUP,
      EventType.TRIP_DRIVER_EN_ROUTE,
      'starting pickup',
    );
  }

  async arrivePickup(driverId: string): Promise<any> {
    return this.executeWithErrorHandling('reaching pickup', async () => {
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const tripDetails = await this.validateTripExists(tripId);

      const pickupLocation = this.extractPickupLocation(tripDetails);
      await this.verifyDriverLocation(
        driverId,
        pickupLocation,
        100,
        'You are too far from the pickup location',
      );

      const result = await this.updateTripStatus(
        tripId,
        TripStatus.ARRIVED_AT_PICKUP,
      );

      if (result.success && result.trip) {
        await this.handleTripStatusUpdate(
          driverId,
          result.trip,
          EventType.TRIP_DRIVER_ARRIVED,
        );
      }

      return result;
    });
  }

  async startTrip(driverId: string): Promise<any> {
    return this.executeDriverTripAction(
      driverId,
      TripStatus.TRIP_IN_PROGRESS,
      EventType.TRIP_STARTED,
      'beginning trip',
    );
  }

  async arrivedStop(driverId: string): Promise<any> {
    return this.executeWithErrorHandling(
      'arriving at destination',
      async () => {
        const tripId = await this.getUserActiveTripId(
          driverId,
          UserType.DRIVER,
        );
        const tripDetails = await this.validateTripExists(tripId);
        /*
      const destinationLocation = this.extractDestinationLocation(tripDetails);
      await this.verifyDriverLocation(
        driverId,
        destinationLocation,
        100,
        'You are too far from the destination location'
      );
*/
        const tripCalculations = this.calculateFinalTripCost(tripDetails);

        const updateData = {
          status: TripStatus.PAYMENT,
          tripEndTime: new Date(),
          actualDuration: tripCalculations.actualDuration,
          finalCost: tripCalculations.finalCost,
        };

        const updatedTrip = await this.updateTripWithData(tripId, updateData);

        await this.eventService.notifyCustomer(
          updatedTrip,
          updatedTrip.customer.id,
          EventType.TRIP_PAYMENT_REQUIRED,
        );

        return { success: true, trip: updatedTrip };
      },
    );
  }

  async cancelTripByDriver(driverId: string): Promise<TripOperationResult> {
    return this.lockService.executeWithLock(
      `driver:${driverId}:cancel`,
      async () => {
        return this.executeWithErrorHandling('cancelling trip by driver', async () => {
          // 1. Get driver's active trip
          const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
          const trip = await this.validateTripExists(tripId);

          // 2. Validate trip can be cancelled
          this.validateCancellableStatus(trip.status);

          // 3. Calculate time difference since trip acceptance
          const timeDifferenceMinutes = this.driverPenaltyService.calculateTimeDifference(trip.tripStartTime);

          // 4. Apply penalty if more than 5 minutes
          if (this.driverPenaltyService.shouldApplyPenalty(timeDifferenceMinutes)) {
            await this.driverPenaltyService.createPenalty(driverId, UserType.DRIVER, trip, timeDifferenceMinutes);
            this.logger.log(`Penalty applied to driver ${driverId} for late cancellation: ${timeDifferenceMinutes} minutes`);
          }

          // 5. Update trip status to cancelled
          const updatedTrip = await this.updateTripWithData(tripId, {
            status: TripStatus.CANCELLED,
          });

          // 6. Clean up active trips
          await this.cleanupCancelledTrip(driverId, trip.customer.id);

          // 7. Notify customer
          await this.eventService.notifyCustomer(
            updatedTrip,
            trip.customer.id,
            EventType.TRIP_CANCELLED,
          );

          return { success: true, trip: updatedTrip };
        });
      },
      'Trip cancellation is currently being processed. Please try again.',
      30000, // 30 seconds timeout
      2, // 2 retries
    );
  }

  async cancelTripByCustomer(customerId: string): Promise<TripOperationResult> {
    return this.lockService.executeWithLock(
      `customer:${customerId}:cancel`,
      async () => {
        return this.executeWithErrorHandling('cancelling trip by customer', async () => {
          // 1. Get customer's active trip
          const tripId = await this.getUserActiveTripId(customerId, UserType.CUSTOMER);
          const trip = await this.validateTripExists(tripId);

          // 2. Validate trip can be cancelled
          this.validateCustomerCancellableStatus(trip.status);

          // 3. Calculate time difference since trip acceptance (if driver assigned)
          let timeDifferenceMinutes = 0;
          if (trip.tripStartTime) {
            timeDifferenceMinutes = this.driverPenaltyService.calculateTimeDifference(trip.tripStartTime);
          }

          // 4. Apply penalty if more than 5 minutes and driver is assigned
          if (trip.driver && this.driverPenaltyService.shouldApplyPenalty(timeDifferenceMinutes)) {
            await this.driverPenaltyService.createPenalty(customerId, UserType.CUSTOMER, trip, timeDifferenceMinutes);
            this.logger.log(`Penalty applied to customer ${customerId} for late cancellation: ${timeDifferenceMinutes} minutes`);
          }

          // 5. Update trip status to cancelled
          const updatedTrip = await this.updateTripWithData(tripId, {
            status: TripStatus.CANCELLED,
          });

          // 6. Clean up active trips
          if (trip.driver) {
            await this.cleanupCancelledTrip(trip.driver.id, customerId);
            // 7. Notify driver if assigned
            await this.eventService.sendToUser(
              trip.driver.id,
              EventType.TRIP_CANCELLED,
              { trip: updatedTrip, cancelledBy: 'customer' }
            );
          } else {
            await this.activeTripService.removeUserActiveTrip(customerId, UserType.CUSTOMER);
          }

          return { success: true, trip: updatedTrip };
        });
      },
      'Trip cancellation is currently being processed. Please try again.',
      30000, // 30 seconds timeout
      2, // 2 retries
    );
  }

  async updateTrip(
    tripId: string,
    tripData: UpdateTripDto,
  ): Promise<TripOperationResult> {
    return this.lockService.executeWithLock(
      `trip:${tripId}`,
      async () => {
        const trip = await this.validateTripExists(tripId);

        if (tripData.status && tripData.status !== trip.status) {
          this.validateStatusTransition(trip.status, tripData.status);
        }

        const updatedTrip = await this.updateTripWithData(tripId, tripData);
        return { success: true, trip: updatedTrip };
      },
      TripErrors.TRIP_LOCKED.message,
    );
  }

  // ================================
  // DEADLOCK-SAFE STATUS UPDATE METHODS
  // ================================

  /**
   * External method with lock - for direct API calls
   */
  async updateTripStatus(
    tripId: string,
    newStatus: TripStatus,
  ): Promise<TripOperationResult> {
    return this.lockService.executeWithLock(
      `trip:${tripId}`,
      async () => {
        return this.updateTripStatusInternal(tripId, newStatus);
      },
      'Trip status is currently being updated by another request. Please try again.',
      30000, // 30 seconds timeout
      2, // 2 retries
    );
  }

  /**
   * Internal method without lock - for use within already locked contexts
   * DEADLOCK-SAFE: This method should be used when lock is already acquired
   */
  private async updateTripStatusInternal(
    tripId: string,
    newStatus: TripStatus,
  ): Promise<TripOperationResult> {
    const trip = await this.validateTripExists(tripId);

    this.validateAllowedStatusUpdate(newStatus);
    this.validateStatusTransition(trip.status, newStatus);

    const updateData =
      newStatus === TripStatus.COMPLETED
        ? { status: newStatus, tripEndTime: new Date() }
        : { status: newStatus };

    const updatedTrip = await this.updateTripWithData(tripId, updateData);
    return { success: true, trip: updatedTrip };
  }

  async findById(tripId: string): Promise<TripDocument | null> {
    return this.tripRepository.findById(tripId);
  }

  async getNearbyAvailableDrivers(
    latitude: number,
    longitude: number,
  ): Promise<FindNearbyUsersResult> {
    return this.nearbySearchService.findNearbyUsers(
      UserType.DRIVER,
      latitude,
      longitude,
      5,
      true,
    );
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private calculateEstimatedCost(durationInSeconds: number): number {
    const durationInMinutes = durationInSeconds / 60;
    const costPerMinute = this.configService.tripCostPerMinute;
    return Math.round(durationInMinutes * costPerMinute * 100) / 100;
  }

  private calculateFinalTripCost(tripDetails: TripDocument): {
    actualDuration: number;
    finalCost: number;
  } {
    const tripStartTime = tripDetails.tripStartTime;
    const tripEndTime = new Date();

    // Gerçek süreyi hesapla (saniye cinsinden)
    const actualDuration = Math.floor(
      (tripEndTime.getTime() - tripStartTime.getTime()) / 1000,
    );

    // Dakika başı 1 dirham hesaplama
    const durationInMinutes = Math.ceil(actualDuration / 60); // Yukarı yuvarlama
    const costPerMinute = this.configService.tripCostPerMinute; // 1 dirham
    const finalCost = durationInMinutes * costPerMinute;

    return {
      actualDuration,
      finalCost,
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

  private async searchDriver(lat: number, lon: number): Promise<string[]> {
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
    return typedDrivers.map((driver) => driver.userId);
  }

  private async validateTripForRequest(
    tripId: string,
    customerId: string,
  ): Promise<TripDocument> {
    const trip = await this.validateTripExists(tripId);

    this.validateMultipleStatuses(trip.status, [
      TripStatus.DRAFT,
      TripStatus.DRIVER_NOT_FOUND,
    ]);
    await this.validateCustomerNoActiveTrip(customerId, tripId);

    return trip;
  }

  private async validateCustomerNoActiveTrip(
    customerId: string,
    currentTripId: string,
  ): Promise<void> {
    const customerActiveTripResult =
      await this.findActiveByCustomerId(customerId);

    if (
      customerActiveTripResult.trip &&
      customerActiveTripResult.trip._id &&
      customerActiveTripResult.trip._id !== currentTripId
    ) {
      throw new BadRequestException(
        `Customer already has an active trip with ID: ${customerActiveTripResult.trip._id}`,
      );
    }
  }

  private buildDriverRequestUpdateData(
    driverIds: string[],
    currentRetryCount: number,
  ): UpdateTripDto {
    return {
      status: TripStatus.WAITING_FOR_DRIVER,
      calledDriverIds: driverIds,
      callStartTime: new Date(),
      callRetryCount: (currentRetryCount || 0) + 1,
    };
  }

  private async handleDriverRejection(
    tripId: string,
    driverId: string,
  ): Promise<TripOperationResult> {
    const trip = await this.validateTripExists(tripId);
    this.validateSingleStatus(trip.status, TripStatus.WAITING_FOR_DRIVER);

    const rejectedDriverIds = [...(trip.rejectedDriverIds || [])];
    if (!rejectedDriverIds.includes(driverId)) {
      rejectedDriverIds.push(driverId);
    }

    const newStatus = this.determineStatusAfterRejection(
      trip,
      rejectedDriverIds,
    );
    const updatedTrip = await this.updateTripWithData(tripId, {
      rejectedDriverIds,
      status: newStatus,
    });

    if (this.areAllDriversRejected(updatedTrip)) {
      await this.eventService.notifyCustomerDriverNotFound(
        updatedTrip,
        updatedTrip.customer.id,
      );
    }

    return { success: true, trip: updatedTrip };
  }

  private determineStatusAfterRejection(
    trip: TripDocument,
    rejectedDriverIds: string[],
  ): TripStatus {
    if (trip.calledDriverIds && trip.calledDriverIds.length > 0) {
      const allDriversRejected = trip.calledDriverIds.every((id) =>
        rejectedDriverIds.includes(id),
      );
      return allDriversRejected ? TripStatus.DRIVER_NOT_FOUND : trip.status;
    }
    return trip.status;
  }

  private areAllDriversRejected(trip: TripDocument): boolean {
    return trip.calledDriverIds.length === trip.rejectedDriverIds.length;
  }

  private async updateTripWithDriverInfo(
    tripId: string,
    driver: any,
  ): Promise<TripDocument> {
    const updateData = {
      driver: {
        id: driver._id,
        name: driver.name,
        surname: driver.surname,
        photoUrl: driver.photoUrl,
        rate: driver.rate,
      },
      status: TripStatus.APPROVED,
      tripStartTime: new Date(),
    };

    return this.updateTripWithData(tripId, updateData);
  }

  private async handleTripApproval(
    updatedTrip: TripDocument,
    driverId: string,
  ): Promise<void> {
    await this.setUserActiveTrip(driverId, UserType.DRIVER, updatedTrip._id);
    await this.activeTripService.refreshUserActiveTripExpiry(
      updatedTrip.customer.id,
      UserType.CUSTOMER,
    );

    await this.notifyRemainingDrivers(updatedTrip, driverId);
    await this.eventService.notifyCustomer(
      updatedTrip,
      updatedTrip.customer.id,
      EventType.TRIP_DRIVER_ASSIGNED,
    );
    await this.sendDriverLocationToCustomer(
      updatedTrip.customer.id,
      driverId,
      updatedTrip._id,
    );
  }

  private async notifyRemainingDrivers(
    updatedTrip: TripDocument,
    approvedDriverId: string,
  ): Promise<void> {
    const remainingDriverIds = updatedTrip.calledDriverIds.filter(
      (id) =>
        !updatedTrip.rejectedDriverIds.includes(id) && id !== approvedDriverId,
    );

    if (remainingDriverIds.length > 0) {
      await this.eventService.notifyTripAlreadyTaken(
        updatedTrip,
        remainingDriverIds,
      );
    }
  }

  private async sendDriverLocationToCustomer(
    customerId: string,
    driverId: string,
    tripId: string,
  ): Promise<void> {
    const driverLocation = await this.locationService.getUserLocation(driverId);
    if (driverLocation) {
      const data = {
        tripId,
        driverId,
        location: driverLocation,
        timestamp: new Date().toISOString(),
      };
      await this.eventService.sendToUser(
        customerId,
        EventType.DRIVER_LOCATION_UPDATED,
        data,
      );
    }
  }

  private extractPickupLocation(tripDetails: TripDocument): LocationCoords {
    const pickupLocation =
      tripDetails.route && tripDetails.route.length > 0
        ? tripDetails.route[0]
        : null;

    if (!pickupLocation || !pickupLocation.lat || !pickupLocation.lon) {
      throw new BadRequestException(
        'Pickup location not found in trip details',
      );
    }

    return { lat: pickupLocation.lat, lon: pickupLocation.lon };
  }

  private extractDestinationLocation(
    tripDetails: TripDocument,
  ): LocationCoords {
    const destinationLocation =
      tripDetails.route && tripDetails.route.length > 0
        ? tripDetails.route[tripDetails.route.length - 1] // Son nokta
        : null;

    if (
      !destinationLocation ||
      !destinationLocation.lat ||
      !destinationLocation.lon
    ) {
      throw new BadRequestException(
        'Destination location not found in trip details',
      );
    }

    return { lat: destinationLocation.lat, lon: destinationLocation.lon };
  }

  private async executeDriverTripAction(
    driverId: string,
    newStatus: TripStatus,
    eventType: EventType,
    actionName: string,
  ): Promise<any> {
    return this.executeWithErrorHandling(actionName, async () => {
      const tripId = await this.getUserActiveTripId(driverId, UserType.DRIVER);
      const result = await this.updateTripStatus(tripId, newStatus);

      if (result.success && result.trip) {
        await this.handleTripStatusUpdate(driverId, result.trip, eventType);
      }

      return result;
    });
  }

  private async handleTripStatusUpdate(
    driverId: string,
    trip: TripDocument,
    eventType: EventType,
  ): Promise<void> {
    const customerId = trip.customer.id;
    await this.refreshUsersTripExpiry(driverId, customerId);
    await this.eventService.notifyCustomer(trip, customerId, eventType);
  }

  async cleanupCompletedTrip(
    driverId: string,
    customerId: string,
  ): Promise<void> {
    await this.activeTripService.removeUserActiveTrip(
      driverId,
      UserType.DRIVER,
    );
    await this.activeTripService.removeUserActiveTrip(
      customerId,
      UserType.CUSTOMER,
    );
  }

  private async refreshUsersTripExpiry(
    driverId: string,
    customerId: string,
  ): Promise<void> {
    await Promise.all([
      this.activeTripService.refreshUserActiveTripExpiry(
        driverId,
        UserType.DRIVER,
      ),
      this.activeTripService.refreshUserActiveTripExpiry(
        customerId,
        UserType.CUSTOMER,
      ),
    ]);
  }

  private async setUserActiveTrip(
    userId: string,
    userType: UserType,
    tripId: string,
  ): Promise<void> {
    if (userType === UserType.CUSTOMER) {
      await this.customersClient.setActiveTrip(userId, { tripId });
    } else {
      await this.driversClient.setActiveTrip(userId, { tripId });
    }

    await this.activeTripService.setUserActiveTripId(userId, userType, tripId);
  }

  // ================================
  // VALIDATION HELPERS
  // ================================

  /**
   * Validates that the customer has a valid payment method before requesting a driver
   */
  private async validateCustomerHasPaymentMethod(customerId: string): Promise<void> {
    try {
      const defaultPaymentMethod = await this.paymentMethodService.getDefaultPaymentMethod(customerId);
      
      if (!defaultPaymentMethod) {
        throw new BadRequestException('You must add a payment method before requesting a driver');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Error validating payment method for customer ${customerId}: ${error.message}`);
      throw new BadRequestException('Unable to validate payment method. Please try again.');
    }
  }

  private async validateTripExists(tripId: string): Promise<TripDocument> {
    const trip = await this.findById(tripId);
    if (!trip) {
      throw new BadRequestException(TripErrors.TRIP_NOT_FOUND.message);
    }
    return trip;
  }

  private validateSingleStatus(
    currentStatus: TripStatus,
    expectedStatus: TripStatus,
  ): void {
    const validation = this.tripStateService.validateStatus(
      currentStatus,
      expectedStatus,
    );
    if (!validation.valid) {
      throw new BadRequestException(
        validation.message || TripErrors.TRIP_INVALID_STATUS.message,
      );
    }
  }

  private validateMultipleStatuses(
    currentStatus: TripStatus,
    allowedStatuses: TripStatus[],
  ): void {
    const validation = this.tripStateService.validateMultipleStatuses(
      currentStatus,
      allowedStatuses,
    );
    if (!validation.valid) {
      throw new BadRequestException(
        validation.message || TripErrors.TRIP_INVALID_STATUS.message,
      );
    }
  }

  private validateStatusTransition(
    fromStatus: TripStatus,
    toStatus: TripStatus,
  ): void {
    const validation = this.tripStateService.canTransition(
      fromStatus,
      toStatus,
    );
    if (!validation.valid) {
      throw new BadRequestException(
        validation.message || TripErrors.TRIP_INVALID_STATUS.message,
      );
    }
  }

  private validateCancellableStatus(status: TripStatus): void {
    const cancellableStatuses = [
      TripStatus.APPROVED,
      TripStatus.DRIVER_ON_WAY_TO_PICKUP,
      TripStatus.ARRIVED_AT_PICKUP,
    ];

    if (!cancellableStatuses.includes(status)) {
      throw new BadRequestException(
        `Trip cannot be cancelled at this stage. Current status: ${status}`,
      );
    }
  }

  private validateCustomerCancellableStatus(status: TripStatus): void {
    const cancellableStatuses = [
      TripStatus.DRAFT,
      TripStatus.WAITING_FOR_DRIVER,
      TripStatus.DRIVER_NOT_FOUND,
      TripStatus.APPROVED,
      TripStatus.DRIVER_ON_WAY_TO_PICKUP,
      TripStatus.ARRIVED_AT_PICKUP,
    ];

    if (!cancellableStatuses.includes(status)) {
      throw new BadRequestException(
        `Trip cannot be cancelled at this stage. Current status: ${status}`,
      );
    }
  }

  private async cleanupCancelledTrip(
    driverId: string,
    customerId: string,
  ): Promise<void> {
    await this.activeTripService.removeUserActiveTrip(
      driverId,
      UserType.DRIVER,
    );
    await this.activeTripService.removeUserActiveTrip(
      customerId,
      UserType.CUSTOMER,
    );
  }

  // ================================
  // DATABASE HELPERS
  // ================================

  private async updateTripWithData(
    tripId: string,
    updateData: any,
  ): Promise<TripDocument> {
    const updatedTrip = await this.tripRepository.findByIdAndUpdate(
      tripId,
      updateData,
    );
    if (!updatedTrip) {
      throw new BadRequestException('Failed to update trip');
    }
    return updatedTrip;
  }

  private validateAllowedStatusUpdate(newStatus: TripStatus): void {
    const allowedStatuses = [
      TripStatus.DRIVER_ON_WAY_TO_PICKUP,
      TripStatus.ARRIVED_AT_PICKUP,
      TripStatus.TRIP_IN_PROGRESS,
      TripStatus.PAYMENT,
      TripStatus.COMPLETED,
    ];

    if (!allowedStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot update to status ${newStatus}. Only ${allowedStatuses.join(', ')} are allowed.`,
      );
    }
  }

  // ================================
  // ACTIVE TRIP MANAGEMENT
  // ================================

  private async getUserActiveTrip(
    userId: string,
    userType: UserType,
  ): Promise<ActiveTripResult> {
    try {
      const tripId = await this.activeTripService.getUserActiveTripIfExists(
        userId,
        userType,
      );

      if (tripId) {
        return await this.handleExistingActiveTripId(userId, userType, tripId);
      }

      return await this.findAndCacheActiveTrip(userId, userType);
    } catch (error) {
      this.logger.error(`Error getting active trip: ${error.message}`);
      return this.findActiveTripByUserType(userId, userType);
    }
  }

  private async handleExistingActiveTripId(
    userId: string,
    userType: UserType,
    tripId: string,
  ): Promise<ActiveTripResult> {
    if (!this.activeTripService.isValidTripId(tripId)) {
      return this.handleInvalidTripId(userId, userType);
    }

    try {
      const tripDetails = await this.findById(tripId);

      if (this.isTripCompleted(tripDetails)) {
        return this.handleInvalidTripId(userId, userType);
      }

      await this.activeTripService.refreshUserActiveTripExpiry(
        userId,
        userType,
      );
      return { success: true, trip: tripDetails! };
    } catch (apiError) {
      return this.handleInvalidTripId(userId, userType);
    }
  }

  private async handleInvalidTripId(
    userId: string,
    userType: UserType,
  ): Promise<ActiveTripResult> {
    await this.activeTripService.removeUserActiveTrip(userId, userType);
    return this.findActiveTripByUserType(userId, userType);
  }

  private isTripCompleted(tripDetails: TripDocument | null): boolean {
    return (
      !tripDetails ||
      tripDetails.status === TripStatus.COMPLETED ||
      tripDetails.status === TripStatus.CANCELLED
    );
  }

  private async findAndCacheActiveTrip(
    userId: string,
    userType: UserType,
  ): Promise<ActiveTripResult> {
    const result = await this.findActiveTripByUserType(userId, userType);

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
  }

  private async findActiveTripByUserType(
    userId: string,
    userType: UserType,
  ): Promise<ActiveTripResult> {
    return userType === UserType.DRIVER
      ? await this.findActiveByDriverId(userId)
      : await this.findActiveByCustomerId(userId);
  }

  private async getUserActiveTripId(
    userId: string,
    userType: UserType,
  ): Promise<string> {
    const tripId = await this.activeTripService.getUserActiveTripIfExists(
      userId,
      userType,
    );

    if (tripId && this.activeTripService.isValidTripId(tripId)) {
      return tripId;
    }

    return this.getUserActiveTripIdFromDb(userId, userType);
  }

  private async getUserActiveTripIdFromDb(
    userId: string,
    userType: UserType,
  ): Promise<string> {
    const result =
      userType === UserType.DRIVER
        ? await this.findActiveByDriverId(userId)
        : await this.findActiveByCustomerId(userId);

    if (result.success && result.trip) {
      const tripId = result.trip._id || result.trip.id;
      if (tripId) return tripId;
    }

    throw new BadRequestException('User have no active trip!!!');
  }

  async findActiveByCustomerId(customerId: string): Promise<ActiveTripResult> {
    const activeTrip = await this.tripRepository.findActiveByCustomerId(customerId);
    
    if (!activeTrip) {
      return { success: false, message: 'No active trip found for this customer' };
    }

    return { success: true, trip: activeTrip };
  }

  async findActiveByDriverId(driverId: string): Promise<ActiveTripResult> {
    const activeTrip = await this.tripRepository.findActiveByDriverId(driverId);
    
    if (!activeTrip) {
      return { success: false, message: 'No active trip found for this driver' };
    }

    return { success: true, trip: activeTrip };
  }


  // ================================
  // LOCATION VERIFICATION
  // ================================

  private async verifyDriverLocation(
    driverId: string,
    targetLocation: LocationCoords,
    maxDistance: number = 100,
    errorMessage: string = 'You are too far from the target location',
  ): Promise<void> {
    const driverLocation = await this.locationService.getUserLocation(driverId);

    if (!driverLocation) {
      throw new BadRequestException(
        'Driver location not found. Please ensure your location is enabled.',
      );
    }

    const distance = await this.calculateDistanceToTarget(
      driverId,
      driverLocation,
      targetLocation,
    );

    if (distance > maxDistance) {
      throw new BadRequestException(
        `${errorMessage} (${Math.round(distance)}m). You must be within ${maxDistance}m.`,
      );
    }
  }

  private async calculateDistanceToTarget(
    driverId: string,
    driverLocation: any,
    targetLocation: LocationCoords,
  ): Promise<number> {
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
    return distanceResult.results?.[driverId]?.distance ?? Infinity;
  }

  // ================================
  // ERROR HANDLING
  // ================================

  private async executeWithErrorHandling<T>(
    actionName: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(`Error ${actionName}: ${error.message}`);

      if (
        error instanceof RedisException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error.response?.data?.message || `Failed to ${actionName}`,
      );
    }
  }
}
