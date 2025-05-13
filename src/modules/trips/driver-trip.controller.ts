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
    return await this.tripsService.getCustomerActiveTrip(user.userId);
  }

  @Post('approve/:tripId')
  async approveTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {}

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
