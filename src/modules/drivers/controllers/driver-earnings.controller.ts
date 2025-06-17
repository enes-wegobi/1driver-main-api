import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { DriverEarningsService } from '../services/driver-earnings.service';
import { LoggerService } from 'src/logger/logger.service';

@Controller('drivers/earnings')
@UseGuards(JwtAuthGuard)
export class DriverEarningsController {
  constructor(
    private readonly driverEarningsService: DriverEarningsService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Get current week earnings for driver
   */
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

  /**
   * Get earnings history for driver with pagination and week-based sorting
   */
  @Get('history')
  async getEarningsHistory(
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
      `Getting earnings history for driver ${user.userId} - page: ${page}, limit: ${limit}, sortOrder: ${sortOrder}`,
    );

    const result = await this.driverEarningsService.getEarningsHistory(
      user.userId,
      page,
      limit,
      'weekStartDate',
      sortOrder,
    );

    return {
      data: result.data.map((earnings) => ({
        driverId: earnings.driverId,
        totalTrips: earnings.totalTrips,
        totalDuration: earnings.totalDuration,
        totalEarnings: earnings.totalEarnings,
        status: earnings.status,
        paymentStatus: earnings.paymentStatus,
        paidAt: earnings.paidAt,
        weekStartDate: earnings.weekStartDate,
        weekEndDate: earnings.weekEndDate,
        trips: earnings.trips.map((trip) => ({
          tripId: trip.tripId.toString(),
          tripDate: trip.tripDate,
          duration: trip.duration,
          multiplier: trip.multiplier,
          earnings: trip.earnings,
        })),
      })),
      pagination: result.pagination,
    };
  }
}
