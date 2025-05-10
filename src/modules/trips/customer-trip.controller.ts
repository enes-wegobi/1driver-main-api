import { Controller, Get, UseGuards, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { EstimateTripDto } from './dto/estimate-trip.dto';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { RequestDriverDto } from './dto/request-driver.dto';

@ApiTags('customer-trips')
@Controller('customer-trips')
export class CustomersTripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post('estimate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estimate trip fare and duration' })
  @ApiBody({ type: EstimateTripDto })
  async estimate(
    @Body() estimateTripDto: EstimateTripDto,
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripsService.estimate(estimateTripDto, user.userId);
  }

  @Post('request-driver')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a driver for a trip' })
  @ApiBody({ type: RequestDriverDto })
  async requestDriver(
    @Body() requestDriverDto: { tripId: string },
    @GetUser() user: IJwtPayload,
  ) {
    return await this.tripsService.requestDriver(
      requestDriverDto.tripId,
      user.userId,
    );
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripsService.getCustomerActiveTrip(user.userId);
  }

    @Get('/nearby-drivers')
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
      const drivers = await this.tripsService.getNearbyAvailableDrivers(latitude, longitude);
      return {
        total: drivers.length,
        drivers,
      };
    }
}

/*
  @Post(':tripId/create-room')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a trip room for real-time location sharing',
  })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip room created successfully' })
  async createTripRoom(@Param('tripId') tripId: string, @GetUser() user: any) {
    // Get trip to check permissions
    const trip = await this.tripsService.getTripById(tripId);

    // Only the customer or assigned driver can create a trip room
    if (user.userId !== trip.customerId && user.userId !== trip.driverId) {
      throw new HttpException(
        'You do not have permission to create a room for this trip',
        HttpStatus.FORBIDDEN,
      );
    }

    const success = await this.tripsService.createTripRoom(tripId);

    return {
      success,
      message: success
        ? 'Trip room created successfully'
        : 'Failed to create trip room',
    };
  }
    */
