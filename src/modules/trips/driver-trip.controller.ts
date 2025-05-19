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

@ApiTags('driver-trips')
@Controller('driver-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriversTripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('active')
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripsService.getDriverActiveTrip(user.userId);
  }

  @Post('approve/:tripId')
  async approveTrip(
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

      await this.tripsService.notifyCustomerTripApproved(
        result.trip,
        customerId,
      );
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

  @Post('start-pickup')
  async startPickup(@GetUser() user: IJwtPayload) {
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
      await this.tripsService.notifyCustomerTripStarted(
        result.trip,
        customerId,
      );
    }

    return result;
  }

  @Post('reach-pickup')
  async reachPickup(@GetUser() user: IJwtPayload) {
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

  @Post('begin-trip')
  async beginTrip(@GetUser() user: IJwtPayload) {
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
      await this.tripsService.notifyCustomerTripBegun(result.trip, customerId);
    }

    return result;
  }

  @Post('arrived-at-stop')
  async arrivedStop(@GetUser() user: IJwtPayload) {}

  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {}
}
