import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { DriverEarningsService } from '../services/driver-earnings.service';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('Driver Earnings')
@ApiBearerAuth()
@Controller('drivers/earnings')
@UseGuards(JwtAuthGuard)
export class DriverEarningsController {
  constructor(
    private readonly driverEarningsService: DriverEarningsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get current week earnings for driver
  
  @ApiOperation({ summary: 'Get current week earnings for driver' })
  @ApiResponse({
    status: 200,
    description: 'Current week earnings retrieved successfully',
  })
  @Get('current-week')
  async getCurrentWeekEarnings(@GetUser() user: IJwtPayload) {
    this.logger.info(`Getting current week earnings for driver ${user.userId}`);

    const earnings = await this.driverEarningsService.getCurrentWeekEarnings(
      user.userId,
    );

    if (!earnings) {
      return {
        driverId: user.userId,
        totalTrips: 0,
        totalDuration: 0,
        totalEarnings: 0,
        trips: [],
        status: 'ACTIVE',
        weekStartDate: null,
        weekEndDate: null,
      };
    }

    return {
      driverId: earnings.driverId,
      totalTrips: earnings.totalTrips,
      totalDuration: earnings.totalDuration,
      totalEarnings: earnings.totalEarnings,
      trips: earnings.trips.map((trip) => ({
        tripId: trip.tripId.toString(),
        tripDate: trip.tripDate,
        duration: trip.duration,
        multiplier: trip.multiplier,
        earnings: trip.earnings,
      })),
      status: earnings.status,
      weekStartDate: earnings.weekStartDate,
      weekEndDate: earnings.weekEndDate,
    };
  }
 */
  /**
   * Get all earnings for driver with pagination
   */
  @ApiOperation({ summary: 'Get all earnings for driver with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings list retrieved successfully',
  })
  @Get()
  async getAllEarnings(
    @GetUser() user: IJwtPayload,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    // Validate sortOrder parameter
    if (!['asc', 'desc'].includes(sortOrder)) {
      sortOrder = 'desc';
    }

    this.logger.info(
      `Getting all earnings for driver ${user.userId} - page: ${page}, limit: ${limit}, sortOrder: ${sortOrder}`,
    );

    const result = await this.driverEarningsService.getAllEarnings(
      user.userId,
      page,
      limit,
      'weekStartDate',
      sortOrder,
    );

    return {
      data: result.data.map((earnings) => ({
        id: earnings._id.toString(),
        driverId: earnings.driverId,
        totalTrips: earnings.totalTrips,
        totalDuration: earnings.totalDuration,
        totalEarnings: earnings.totalEarnings,
        status: earnings.status,
        paymentStatus: earnings.paymentStatus,
        paidAt: earnings.paidAt,
        weekStartDate: earnings.weekStartDate,
        weekEndDate: earnings.weekEndDate,
      })),
      pagination: result.pagination,
    };
  }

  /**
   * Get earnings detail by ID
   */
  @ApiOperation({ summary: 'Get earnings detail by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Earnings record ID (MongoDB ObjectId)',
  })
  @ApiResponse({
    status: 200,
    description: 'Earnings detail retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Earnings record not found',
  })
  @Get(':id')
  async getEarningsById(@Param('id') id: string) {
    this.logger.info(`Getting earnings detail for ID: ${id}`);

    const earnings = await this.driverEarningsService.getEarningsById(id);

    if (!earnings) {
      throw new NotFoundException('Earnings record not found');
    }

    return {
      id: earnings._id.toString(),
      driverId: earnings.driverId,
      totalTrips: earnings.totalTrips,
      totalDuration: earnings.totalDuration,
      totalEarnings: earnings.totalEarnings,
      status: earnings.status,
      paymentStatus: earnings.paymentStatus,
      paidAt: earnings.paidAt,
      weekStartDate: earnings.weekStartDate,
      weekEndDate: earnings.weekEndDate,
      trips: earnings.trips?.map((trip) => ({
        tripId: trip.tripId.toString(),
        tripDate: trip.tripDate,
        duration: trip.duration,
        multiplier: trip.multiplier,
        earnings: trip.earnings,
      })) || [],
    };
  }
}
