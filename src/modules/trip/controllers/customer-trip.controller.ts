import { Controller, Get, UseGuards, Post, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { EstimateTripDto } from '../dto/estimate-trip.dto';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { RequestDriverDto } from '../../trips/dto/request-driver.dto';
import { TripService } from '../services/trip.service';

@ApiTags('customer-trips')
@Controller('customer-trips')
export class CustomersTripsController {
  constructor(private readonly tripService: TripService) {}

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripService.getCustomerActiveTrip(user.userId);
  }

  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Get available drivers near a specific location' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    required: true,
  })
  async getNearbyAvailableDrivers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
  ) {
    const drivers = await this.tripService.getNearbyAvailableDrivers(
      latitude,
      longitude,
    );
    return {
      total: drivers.length,
      drivers,
    };
  }

  @Post('create-draft')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a draft trip with fare and duration estimate',
  })
  @ApiBody({ type: EstimateTripDto })
  async createDraft(
    @Body() estimateTripDto: EstimateTripDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.estimate(estimateTripDto, user.userId);
  }

  @Post('request-driver')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a driver for a trip' })
  @ApiBody({ type: RequestDriverDto })
  async requestDriver(
    @Body() requestDriverDto: RequestDriverDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripService.requestDriver(
      requestDriverDto.tripId,
      requestDriverDto.lat,
      requestDriverDto.lon,
      user.userId,
    );
  }
  /*
  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the active trip' })
  async cancelTrip(@GetUser() user: IJwtPayload) {
    return await this.tripsService.cancelTrip(user.userId, user.userType);
  }
    */
}
