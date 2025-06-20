import { Injectable, Logger } from '@nestjs/common';
import { DriverLocationDto } from 'src/websocket/dto/driver-location.dto';
import { LocationService as RedisLocationService } from 'src/redis/services/location.service';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { TripService } from 'src/modules/trip/services/trip.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { UserType } from 'src/common/user-type.enum';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class LocationService {
  constructor(
    private readonly redisLocationService: RedisLocationService,
    private readonly activeTripService: ActiveTripService,
    private readonly tripService: TripService,
    private readonly webSocketService: WebSocketService,
    private readonly logger: LoggerService,
  ) {}

  async updateDriverLocation(userId: string, payload: DriverLocationDto) {
    try {
      // Get driver's active trip ID
      const tripId = await this.activeTripService.getUserActiveTripIfExists(
        userId,
        UserType.DRIVER,
      );

      if (tripId) {
        const tripDetails = await this.tripService.findById(tripId);

        if (tripDetails && tripDetails.customer && tripDetails.customer.id) {
          const customerId = tripDetails.customer.id;

          this.webSocketService.sendToUser(
            customerId,
            EventType.DRIVER_LOCATION_UPDATED,
            {
              tripId,
              driverId: userId,
              location: payload,
              timestamp: new Date().toISOString(),
            },
          );

        }
      }

      // Store location to redis
      await this.storeUserLocation(userId, 'driver', payload);

      return { tripId };
    } catch (error) {
      this.logger.error(
        `Error processing driver location update: ${error.message}`,
      );
      throw error;
    }
  }

  private async storeUserLocation(
    userId: string,
    userType: string,
    location: DriverLocationDto,
  ) {
    try {
      await this.redisLocationService.storeUserLocation(
        userId,
        userType,
        location,
      );
    } catch (error) {
      this.logger.error(
        `Error storing location for user ${userId}: ${error.message}`,
      );
    }
  }
}
