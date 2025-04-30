import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
  Logger,
  Post,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { NearbyDriversResponseDto } from './dto/nearby-drivers-response.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripStatus } from './enum/trip-status.enum';
import { IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NearbyDriversQueryDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radius?: number = 5;
}

export class SubscribeToNearbyDriversDto {
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius?: number = 5;
}

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  private readonly logger = new Logger(TripsController.name);

  constructor(private readonly tripsService: TripsService) {}

  @Get('nearby-drivers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get nearby available drivers for a trip' })
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
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    required: false,
    default: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'List of nearby available drivers',
    type: NearbyDriversResponseDto,
  })
  async getNearbyDrivers(
    @Query(ValidationPipe) query: NearbyDriversQueryDto,
    @GetUser() user: any,
  ): Promise<NearbyDriversResponseDto> {
    this.logger.debug(
      `User ${user.userId} requested nearby drivers at [${query.latitude}, ${query.longitude}]`,
    );

    return this.tripsService.findNearbyDrivers(
      query.latitude,
      query.longitude,
      query.radius,
    );
  }

  @Post('subscribe-to-nearby-drivers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to real-time updates of nearby drivers' })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to nearby driver updates',
  })
  async subscribeToNearbyDrivers(
    @Body() subscribeDto: SubscribeToNearbyDriversDto,
    @GetUser() user: any,
  ) {
    this.logger.debug(
      `User ${user.userId} subscribed to nearby driver updates at [${subscribeDto.latitude}, ${subscribeDto.longitude}]`,
    );

    const success = await this.tripsService.subscribeToNearbyDriverUpdates(
      user.userId,
      subscribeDto.latitude,
      subscribeDto.longitude,
      subscribeDto.radius,
    );

    return {
      success,
      message: success
        ? 'Successfully subscribed to nearby driver updates'
        : 'Failed to subscribe to nearby driver updates',
    };
  }

  @Post('unsubscribe-from-nearby-drivers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Unsubscribe from real-time updates of nearby drivers',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from nearby driver updates',
  })
  async unsubscribeFromNearbyDrivers(@GetUser() user: any) {
    this.logger.debug(
      `User ${user.userId} unsubscribed from nearby driver updates`,
    );

    const success = await this.tripsService.unsubscribeFromNearbyDriverUpdates(
      user.userId,
    );

    return {
      success,
      message: success
        ? 'Successfully unsubscribed from nearby driver updates'
        : 'Failed to unsubscribe from nearby driver updates',
    };
  }

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new trip request' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  async createTrip(@Body() createTripDto: CreateTripDto, @GetUser() user: any) {
    // Ensure the customer ID in the DTO matches the authenticated user
    if (user.userType !== 'customer') {
      throw new HttpException(
        'Only customers can create trips',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.userId !== createTripDto.customerId) {
      throw new HttpException(
        'You can only create trips for yourself',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.debug(`Customer ${user.userId} created a new trip request`);

    const result = await this.tripsService.createTrip(createTripDto);

    return {
      success: true,
      ...result,
    };
  }

  @Get(':tripId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trip details by ID' })
  @ApiParam({ name: 'tripId', description: 'Trip ID' })
  @ApiResponse({ status: 200, description: 'Trip details' })
  async getTripById(@Param('tripId') tripId: string, @GetUser() user: any) {
    const trip = await this.tripsService.getTripById(tripId);

    // Ensure the user has access to this trip
    if (
      user.userType !== 'admin' &&
      user.userId !== trip.customerId &&
      user.userId !== trip.driverId
    ) {
      throw new HttpException(
        'You do not have access to this trip',
        HttpStatus.FORBIDDEN,
      );
    }

    return trip;
  }

  @Post('update-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update trip status' })
  @ApiResponse({ status: 200, description: 'Trip status updated successfully' })
  async updateTripStatus(
    @Body() updateDto: UpdateTripStatusDto,
    @GetUser() user: any,
  ) {
    // Get current trip data to check permissions
    const trip = await this.tripsService.getTripById(updateDto.tripId);

    // Check if user has permission to update this trip
    if (user.userType === 'customer' && user.userId !== trip.customerId) {
      throw new HttpException(
        'You do not have permission to update this trip',
        HttpStatus.FORBIDDEN,
      );
    }

    if (user.userType === 'driver') {
      // For ACCEPTED status, the driver ID must match the authenticated user
      if (
        updateDto.status === TripStatus.ACCEPTED &&
        updateDto.driverId !== user.userId
      ) {
        throw new HttpException(
          'You can only accept trips for yourself',
          HttpStatus.FORBIDDEN,
        );
      }

      // For other statuses, the driver must be assigned to the trip
      if (trip.driverId && trip.driverId !== user.userId) {
        throw new HttpException(
          'You are not assigned to this trip',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    this.logger.debug(
      `User ${user.userId} (${user.userType}) updated trip ${updateDto.tripId} status to ${updateDto.status}`,
    );

    const result = await this.tripsService.updateTripStatus(updateDto);

    return {
      success: true,
      ...result,
    };
  }

  @Get('user/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active trips for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of active trips' })
  async getUserActiveTrips(@GetUser() user: any) {
    const userType = user.userType === 'customer' ? 'customer' : 'driver';

    this.logger.debug(`Getting active trips for ${userType} ${user.userId}`);

    const trips = await this.tripsService.getUserActiveTrips(
      user.userId,
      userType as 'customer' | 'driver',
    );

    return {
      total: trips.length,
      trips,
    };
  }

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
}
