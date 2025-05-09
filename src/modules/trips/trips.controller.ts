import {
  Controller,
  Get,
  UseGuards,
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
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripStatusDto } from './dto/update-trip-status.dto';
import { TripStatus } from './enum/trip-status.enum';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  private readonly logger = new Logger(TripsController.name);

  constructor(private readonly tripsService: TripsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new trip request' })
  @ApiResponse({ status: 201, description: 'Trip created successfully' })
  async createTrip(@Body() createTripDto: CreateTripDto, @GetUser() user: any) {
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

    const trips = await this.tripsService.getCustomerActiveTrip(user.userId);

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
