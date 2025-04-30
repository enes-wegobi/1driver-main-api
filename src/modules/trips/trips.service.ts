import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { RedisService } from 'src/redis/redis.service';
import { NearbyDriversResponseDto } from './dto/nearby-drivers-response.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import {
  TripStatus,
  isValidStatusTransition,
  TripStatusMessages,
} from './enum/trip-status.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Find nearby available drivers for a trip
   */
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

  /**
   * Subscribe a client to nearby driver updates
   */
  async subscribeToNearbyDriverUpdates(
    clientId: string,
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<boolean> {
    // Create a room for this client's nearby driver updates
    const roomName = `nearby:${clientId}`;

    // Store the subscription parameters in Redis for later use
    await this.redisService.getRedisClient().hSet(`subscription:${clientId}`, {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      createdAt: new Date().toISOString(),
    });

    // Set expiration for the subscription data (30 minutes)
    await this.redisService
      .getRedisClient()
      .expire(`subscription:${clientId}`, 1800);

    return true;
  }

  /**
   * Unsubscribe a client from nearby driver updates
   */
  async unsubscribeFromNearbyDriverUpdates(clientId: string): Promise<boolean> {
    // Remove the subscription data from Redis
    await this.redisService.getRedisClient().del(`subscription:${clientId}`);
    return true;
  }

  /**
   * Create a new trip request
   */
  async createTrip(createTripDto: CreateTripDto): Promise<any> {
    const tripId = uuidv4();
    const now = new Date().toISOString();

    // Create trip object
    const trip = {
      id: tripId,
      customerId: createTripDto.customerId,
      status: TripStatus.REQUESTED,
      pickup: createTripDto.pickup,
      dropoff: createTripDto.dropoff,
      estimatedDistanceKm: createTripDto.estimatedDistanceKm,
      estimatedDurationMinutes: createTripDto.estimatedDurationMinutes,
      estimatedFare: createTripDto.estimatedFare,
      paymentMethod: createTripDto.paymentMethod,
      notes: createTripDto.notes || '',
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: TripStatus.REQUESTED,
          timestamp: now,
          message: TripStatusMessages[TripStatus.REQUESTED],
        },
      ],
    };

    // Store trip in Redis
    await this.redisService
      .getRedisClient()
      .set(`trip:${tripId}`, JSON.stringify(trip));

    // Add to customer's trips list
    await this.redisService
      .getRedisClient()
      .lPush(`customer:${createTripDto.customerId}:trips`, tripId);

    // Add to active trips list
    await this.redisService.getRedisClient().sAdd('trips:active', tripId);

    // Find nearby drivers to notify
    const nearbyDrivers = await this.findNearbyDrivers(
      createTripDto.pickup.latitude,
      createTripDto.pickup.longitude,
      5, // Default radius for trip requests
    );

    // Notify customer about trip creation
    this.webSocketService.sendToUser(createTripDto.customerId, 'tripCreated', {
      tripId,
      status: TripStatus.REQUESTED,
      message: 'Trip request created successfully',
      nearbyDriversCount: nearbyDrivers.total,
    });

    // TODO: Send FCM notifications to nearby drivers

    return {
      tripId,
      status: TripStatus.REQUESTED,
      nearbyDriversCount: nearbyDrivers.total,
    };
  }

  /**
   * Get trip details by ID
   */
  async getTripById(tripId: string): Promise<any> {
    const tripData = await this.redisService
      .getRedisClient()
      .get(`trip:${tripId}`);

    if (!tripData) {
      throw new NotFoundException(`Trip with ID ${tripId} not found`);
    }

    return JSON.parse(tripData);
  }

  /**
   * Update trip status
   */
  async updateTripStatus(updateDto: UpdateTripStatusDto): Promise<any> {
    // Get current trip data
    const trip = await this.getTripById(updateDto.tripId);

    // Validate status transition
    if (!isValidStatusTransition(trip.status, updateDto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${trip.status} to ${updateDto.status}`,
      );
    }

    // Additional validations based on status
    if (updateDto.status === TripStatus.ACCEPTED && !updateDto.driverId) {
      throw new BadRequestException(
        'Driver ID is required when accepting a trip',
      );
    }

    if (
      updateDto.status === TripStatus.CANCELLED &&
      !updateDto.cancellationReason
    ) {
      throw new BadRequestException(
        'Cancellation reason is required when cancelling a trip',
      );
    }

    // Update trip status
    const now = new Date().toISOString();
    trip.status = updateDto.status;
    trip.updatedAt = now;

    // Add status history entry
    trip.statusHistory.push({
      status: updateDto.status,
      timestamp: now,
      message: updateDto.message || TripStatusMessages[updateDto.status],
      driverId: updateDto.driverId,
      cancellationReason: updateDto.cancellationReason,
    });

    // If trip is accepted, assign driver
    if (updateDto.status === TripStatus.ACCEPTED) {
      trip.driverId = updateDto.driverId;

      // Add to driver's trips list
      await this.redisService
        .getRedisClient()
        .lPush(`driver:${updateDto.driverId}:trips`, updateDto.tripId);

      // Create trip room for real-time location sharing
      const roomName = `trip:${updateDto.tripId}`;
      /*
      // Notify driver about trip acceptance
      this.webSocketService.sendToUser(
        updateDto.driverId,
        'tripStatusUpdated',
        {
          tripId: updateDto.tripId,
          status: updateDto.status,
          message: 'You have accepted the trip',
        },
      );
      */
    }

    // If trip is completed or cancelled, remove from active trips
    if (
      updateDto.status === TripStatus.TRIP_COMPLETED ||
      updateDto.status === TripStatus.CANCELLED
    ) {
      await this.redisService
        .getRedisClient()
        .sRem('trips:active', updateDto.tripId);
    }

    // Save updated trip data
    await this.redisService
      .getRedisClient()
      .set(`trip:${updateDto.tripId}`, JSON.stringify(trip));

    // Notify customer about status update
    this.webSocketService.sendToUser(trip.customerId, 'tripStatusUpdated', {
      tripId: updateDto.tripId,
      status: updateDto.status,
      message: updateDto.message || TripStatusMessages[updateDto.status],
    });

    // If driver is assigned, also notify driver about status updates
    if (trip.driverId && trip.driverId !== updateDto.driverId) {
      this.webSocketService.sendToUser(trip.driverId, 'tripStatusUpdated', {
        tripId: updateDto.tripId,
        status: updateDto.status,
        message: updateDto.message || TripStatusMessages[updateDto.status],
      });
    }

    // TODO: Send FCM notifications about status updates

    return {
      tripId: updateDto.tripId,
      status: updateDto.status,
      message: updateDto.message || TripStatusMessages[updateDto.status],
    };
  }

  /**
   * Get active trips for a user (customer or driver)
   */
  async getUserActiveTrips(
    userId: string,
    userType: 'customer' | 'driver',
  ): Promise<any[]> {
    // Get all trip IDs for the user
    const tripIds = await this.redisService
      .getRedisClient()
      .lRange(`${userType}:${userId}:trips`, 0, -1);

    if (!tripIds || tripIds.length === 0) {
      return [];
    }

    // Get active trips
    const activeTrips = [];

    for (const tripId of tripIds) {
      const isActive = await this.redisService
        .getRedisClient()
        .sIsMember('trips:active', tripId);

      if (isActive) {
        const tripData = await this.getTripById(tripId);
        //activeTrips.push(tripData);
      }
    }

    return activeTrips;
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
}
