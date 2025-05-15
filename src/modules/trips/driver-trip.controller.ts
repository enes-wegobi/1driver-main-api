import { Controller, Get, UseGuards, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { EventService } from 'src/modules/event/event.service';
import { RedisService } from 'src/redis/redis.service';

@ApiTags('driver-trips')
@Controller('driver-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriversTripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly eventService: EventService,
    private readonly redisService: RedisService,
  ) {}

  @Get('active')
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripsService.getCustomerActiveTrip(user.userId);
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

      const customerId = result.trip.customerId;
      if (customerId) {
        await this.tripsService.notifyCustomerTripApproved(
          result.trip,
          customerId,
        );
      }
    }

    return result;
  }

  @Post('decline/:tripId')
  async declineTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {}

  @Post('start-pickup')
  async startPickup(@GetUser() user: IJwtPayload) {}

  @Post('reach-pickup')
  async reachPickup(@GetUser() user: IJwtPayload) {}

  @Post('begin-trip')
  async beginPickup(@GetUser() user: IJwtPayload) {}

  @Post('arrived-at-stop')
  async arrivedStop(@GetUser() user: IJwtPayload) {}

  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {}

}
