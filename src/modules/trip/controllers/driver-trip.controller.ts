import { Controller, Get, UseGuards, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { TripService } from '../services/trip.service';
import { DriverTripQueueService } from 'src/redis/services/driver-trip-queue.service';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { TripHistoryQueryDto } from '../dto/trip-history-query.dto';
import { TripHistoryResponseDto } from '../dto/trip-history-response.dto';

@ApiTags('driver-trips')
@Controller('driver-trips')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DriversTripsController {
  constructor(
    private readonly tripService: TripService,
    private readonly driverTripQueueService: DriverTripQueueService,
  ) {}

  @Get('active')
  async getTripById(@GetUser() user: IJwtPayload) {
    return await this.tripService.getDriverActiveTrip(user.userId);
  }

  @Get('last-request')
  async getLastRequest(@GetUser() user: IJwtPayload) {
    const lastRequest = await this.driverTripQueueService.getDriverLastRequest(
      user.userId,
    );

    if (!lastRequest) {
      return {
        success: false,
        message: 'No recent trip request found',
        data: null,
      };
    }

    // Check if trip is still valid
    const trip = await this.tripService.findById(lastRequest.tripId);
    if (!trip || trip.status !== TripStatus.WAITING_FOR_DRIVER) {
      // Clear invalid last request
      await this.driverTripQueueService.clearDriverLastRequest(user.userId);
      return {
        success: false,
        message: 'Trip request is no longer available',
        data: null,
      };
    }

    return {
      success: true,
      message: 'Last trip request found',
      data: {
        lastRequest,
        trip,
        timeAgo: Math.floor((Date.now() - lastRequest.addedAt) / 1000), // seconds ago
      },
    };
  }

  @Post('accept/:tripId')
  async acceptTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    const result = await this.tripService.approveTrip(tripId, user.userId);

    // Clear last request after accepting
    if (result.success) {
      await this.driverTripQueueService.clearDriverLastRequest(user.userId);
    }

    return result;
  }

  @Post('decline/:tripId')
  async declineTrip(
    @Param('tripId') tripId: string,
    @GetUser() user: IJwtPayload,
  ) {
    const result = await this.tripService.declineTrip(tripId, user.userId);

    // Clear last request after declining
    if (result.success) {
      await this.driverTripQueueService.clearDriverLastRequest(user.userId);
    }

    return result;
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
  /*
  @Post('arrive-at-destination')
  async arriveAtDestination(@GetUser() user: IJwtPayload) {
    // return await this.tripService.arriveDestination(user.userId);
  }
  */
  @Post('cancel')
  async cancelTrip(@GetUser() user: IJwtPayload) {
    return await this.tripService.cancelTripByDriver(user.userId);
  }

  @Get('history')
  @ApiOperation({ 
    summary: 'Get driver trip history',
    description: 'Retrieve paginated trip history for the authenticated driver with filtering and sorting options'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Trip history retrieved successfully',
    type: TripHistoryResponseDto 
  })
  async getTripHistory(
    @Query() queryOptions: TripHistoryQueryDto,
    @GetUser() user: IJwtPayload,
  ): Promise<TripHistoryResponseDto> {
    return await this.tripService.getDriverTripHistory(user.userId, queryOptions);
  }
}
