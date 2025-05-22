import { Controller, Get, UseGuards, Post, Param } from '@nestjs/common';
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

  @Post('accept/:tripId')
  async acceptTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripsService.approveTrip(tripId, user.userId);
  }

  @Post('decline/:tripId')
  async declineTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripsService.declineTrip(tripId, user.userId);
  }

  @Post('start-en-route')
  async startEnRoute(@GetUser() user: IJwtPayload) {
    return await this.tripsService.startPickup(user.userId);
  }

  @Post('arrive-at-pickup')
  async arriveAtPickup(@GetUser() user: IJwtPayload) {
    return await this.tripsService.reachPickup(user.userId);
  }

  @Post('start-trip')
  async startTrip(@GetUser() user: IJwtPayload) {
    return await this.tripsService.beginTrip(user.userId);
  }

  @Post('arrived-at-stop')
  async arrivedStop(@GetUser() user: IJwtPayload) {
    return await this.tripsService.arrivedAtStop(user.userId);
  }

  @Post('arrive-at-destination')
  async arriveAtDestination(@GetUser() user: IJwtPayload) {
    return await this.tripsService.arriveAtDestination(user.userId);
  }

  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {
    return await this.tripsService.cancelTrip(user.userId, user.userType);
  }
}
