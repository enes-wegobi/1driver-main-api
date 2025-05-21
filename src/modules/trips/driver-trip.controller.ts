import {
  Controller,
  Get,
  UseGuards,
  Post,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { WebSocketService } from 'src/websocket/websocket.service';
import { LocationService } from 'src/redis/services/location.service';

@ApiTags('driver-trips')
@Controller('driver-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriversTripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly webSocketService: WebSocketService,
    private readonly locationService: LocationService,
  ) {}

  @Get('active')
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripsService.getDriverActiveTrip(user.userId);
  }

  @Post('accept/:tripId')
  async acceptTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    const result = await this.tripsService.approveTrip(tripId, user.userId);

    if (result.success && result.trip) {
      const remainingDriverIds = result.trip.calledDriverIds.filter(
        (driverId) =>
          !result.trip.rejectedDriverIds.includes(driverId) &&
          driverId !== user.userId,
      );

      if (remainingDriverIds.length > 0) {
        await this.tripsService.notifyTripAlreadyTaken(
          result.trip,
          remainingDriverIds,
        );
      }

      const customerId = result.trip.customer.id;

      // Sürücünün mevcut konumunu al
      const driverLocation = await this.locationService.getUserLocation(user.userId);

      await this.tripsService.notifyCustomerDriverAccepted(
        result.trip,
        customerId,
      );
      
      // Eğer sürücü konumu varsa, WebSocket ile müşteriye gönder
      if (driverLocation) {
        this.webSocketService.sendToUser(customerId, 'driverLocation', {
          tripId,
          driverId: user.userId,
          location: driverLocation,
          timestamp: new Date().toISOString()
        });
      }
    }

    return result;
  }

  @Post('decline/:tripId')
  async declineTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    const result = await this.tripsService.declineTrip(tripId, user.userId);

    if (result.success && result.trip) {
      // Check if all called drivers have rejected the trip
      if (
        result.trip.calledDriverIds.length ===
        result.trip.rejectedDriverIds.length
      ) {
        const customerId = result.trip.customer.id;
        await this.tripsService.notifyCustomerDriverNotFound(
          result.trip,
          customerId,
        );
      }
    }

    return result;
  }

  @Post('start-en-route')
  async startEnRoute(@GetUser() user: IJwtPayload) {
    const { success, trip } = await this.tripsService.getDriverActiveTrip(
      user.userId,
    );
    if (!success || !trip) {
      throw new BadRequestException('No active trip found');
    }

    const result = await this.tripsService.startPickup(
      trip._id || trip.id,
      user.userId,
    );

    if (result.success && result.trip) {
      const customerId = result.trip.customer.id;
      await this.tripsService.notifyCustomerDriverEnRoute(
        result.trip,
        customerId,
      );
    }

    return result;
  }

  @Post('arrive-at-pickup')
  async arriveAtPickup(@GetUser() user: IJwtPayload) {
    const { success, trip } = await this.tripsService.getDriverActiveTrip(
      user.userId,
    );
    if (!success || !trip) {
      throw new BadRequestException('No active trip found');
    }

    const result = await this.tripsService.reachPickup(
      trip._id || trip.id,
      user.userId,
    );

    if (result.success && result.trip) {
      const customerId = result.trip.customer.id;
      await this.tripsService.notifyCustomerDriverArrived(
        result.trip,
        customerId,
      );
    }

    return result;
  }

  @Post('start-trip')
  async startTrip(@GetUser() user: IJwtPayload) {
    const { success, trip } = await this.tripsService.getDriverActiveTrip(
      user.userId,
    );
    if (!success || !trip) {
      throw new BadRequestException('No active trip found');
    }

    const result = await this.tripsService.beginTrip(
      trip._id || trip.id,
      user.userId,
    );

    if (result.success && result.trip) {
      const customerId = result.trip.customer.id;
      await this.tripsService.notifyCustomerTripStarted(result.trip, customerId);
    }

    return result;
  }

  @Post('arrived-at-stop')
  async arrivedStop(@GetUser() user: IJwtPayload) {}

  @Post('complete-trip')
  async completeTrip(@GetUser() user: IJwtPayload) {
    const { success, trip } = await this.tripsService.getDriverActiveTrip(
      user.userId,
    );
    if (!success || !trip) {
      throw new BadRequestException('No active trip found');
    }

    const result = await this.tripsService.completeTrip(
      trip._id || trip.id,
      user.userId,
    );

    if (result.success && result.trip) {
      const customerId = result.trip.customer.id;
      // You could add a notification here if needed
      this.webSocketService.sendToUser(customerId, 'tripCompleted', {
        tripId: trip._id || trip.id,
        driverId: user.userId,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  }

  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {
    return await this.tripsService.cancelTrip(user.userId, user.userType);
  }
}
