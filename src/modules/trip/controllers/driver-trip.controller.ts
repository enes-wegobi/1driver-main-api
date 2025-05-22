import { Controller, Get, UseGuards, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { TripService } from '../services/trip.service';

@ApiTags('driver-trips')
@Controller('driver-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriversTripsController {
  constructor(private readonly tripService: TripService) {}

  @Get('active')
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripService.getDriverActiveTrip(user.userId);
  }

  @Post('accept/:tripId')
  async acceptTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.approveTrip(tripId, user.userId);
  }

  @Post('decline/:tripId')
  async declineTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.declineTrip(tripId, user.userId);
  }

  @Post('start-en-route')
  async startEnRoute(@GetUser() user: IJwtPayload) {
    return await this.tripService.startPickup(user.userId);
  }

  @Post('arrive-at-pickup')
  async arriveAtPickup(@GetUser() user: IJwtPayload) {
    return await this.tripService.arrivePickup(user.userId);
  }

  @Post('start-trip')
  async startTrip(@GetUser() user: IJwtPayload) {
    return await this.tripService.startTrip(user.userId);
  }

  @Post('arrived-at-stop')
  async arrivedStop(@GetUser() user: IJwtPayload) {
    return await this.tripService.arrivedStop(user.userId);
  }

  @Post('arrive-at-destination')
  async arriveAtDestination(@GetUser() user: IJwtPayload) {
    // return await this.tripService.arriveDestination(user.userId);
  }

  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {
    //return await this.tripsService.cancelTrip(user.userId, user.userType);
  }
}
