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

@ApiTags('driver-trips')
@Controller('driver-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriversTripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly webSocketService: WebSocketService,
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
    const result = await this.tripsService.startPickup(user.userId);

    return result;
  }

  @Post('arrive-at-pickup')
  async arriveAtPickup(@GetUser() user: IJwtPayload) {
    const result = await this.tripsService.reachPickup(user.userId);

    if (result.success && result.trip) {
    }

    return result;
  }

  @Post('start-trip')
  async startTrip(@GetUser() user: IJwtPayload) {
    const result = await this.tripsService.beginTrip(user.userId);

    return result;
  }

  @Post('arrived-at-stop')
  async arrivedStop(@GetUser() user: IJwtPayload) {}

  @Post('complete-trip')
  async completeTrip(@GetUser() user: IJwtPayload) {
    const result = await this.tripsService.completeTrip(user.userId);

    return result;
  }

  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {
    return await this.tripsService.cancelTrip(user.userId, user.userType);
  }
}
