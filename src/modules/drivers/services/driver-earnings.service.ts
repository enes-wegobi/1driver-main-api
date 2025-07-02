import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Types } from 'mongoose';
import * as moment from 'moment';
import {
  DriverWeeklyEarningsDocument,
  TripEarningDetail,
} from '../schemas/driver-weekly-earnings.schema';
import { DriverWeeklyEarningsRepository } from '../repositories/driver-weekly-earnings.repository';
import { LoggerService } from 'src/logger/logger.service';

export interface TripEarningData {
  tripId: string;
  tripDate: Date;
  duration: number; // seconds
  multiplier: number;
  earnings: number;
}

@Injectable()
export class DriverEarningsService {
  constructor(
    private readonly driverWeeklyEarningsRepository: DriverWeeklyEarningsRepository,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Add trip earnings to weekly record
   */
  async addTripToWeeklyEarnings(
    driverId: string,
    tripData: TripEarningData,
  ): Promise<void> {
    this.logger.info(
      `Adding trip earnings for driver ${driverId}: ${tripData.earnings} TL`,
    );

    // Find or create current week record
    const weeklyRecord = await this.findOrCreateCurrentWeekRecord(driverId);

    // Create trip detail
    const tripDetail: TripEarningDetail = {
      tripId: new Types.ObjectId(tripData.tripId),
      tripDate: tripData.tripDate,
      duration: tripData.duration,
      multiplier: tripData.multiplier,
      earnings: tripData.earnings,
    };

    // Add trip to weekly record
    await this.driverWeeklyEarningsRepository.addTripToWeeklyRecord(
      weeklyRecord._id.toString(),
      tripDetail,
    );

    this.logger.info(
      `Updated weekly earnings for driver ${driverId}. Trip earnings: ${tripData.earnings} TL`,
    );
  }

  /**
   * Get current week earnings for driver
   */
  async getCurrentWeekEarnings(
    driverId: string,
  ): Promise<DriverWeeklyEarningsDocument | null> {
    return this.driverWeeklyEarningsRepository.findActiveByDriverId(driverId);
  }

  /**
   * Get all earnings for driver with pagination and sorting
   */
  async getAllEarnings(
    driverId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'weekStartDate',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{
    data: DriverWeeklyEarningsDocument[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const [data, total] = await Promise.all([
      this.driverWeeklyEarningsRepository.findAllByDriverId(
        driverId,
        page,
        limit,
        sortBy,
        sortOrder,
      ),
      this.driverWeeklyEarningsRepository.countAllByDriverId(driverId),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get earnings by ID
   */
  async getEarningsById(
    id: string,
  ): Promise<DriverWeeklyEarningsDocument | null> {
    return this.driverWeeklyEarningsRepository.findById(id);
  }

  /**
   * Calculate trip earnings based on duration and config
   */
  calculateTripEarnings(durationSeconds: number): {
    earnings: number;
    multiplier: number;
  } {
    const multiplier =
      this.configService.get<number>('driverEarnings.perMinuteRate') || 0.5; // Default fallback
    const durationMinutes = durationSeconds / 60;
    const earnings = Math.round(durationMinutes * multiplier * 100) / 100; // Round to 2 decimal places

    return {
      earnings,
      multiplier,
    };
  }

  /**
   * Find or create current week record for driver
   */
  async findOrCreateCurrentWeekRecord(
    driverId: string,
  ): Promise<DriverWeeklyEarningsDocument> {
    // Try to find existing active record
    let weeklyRecord =
      await this.driverWeeklyEarningsRepository.findActiveByDriverId(driverId);

    if (!weeklyRecord) {
      // Create new record for current week
      weeklyRecord = await this.createNewWeekRecord(driverId);
    }

    return weeklyRecord;
  }

  /**
   * Create new week record for driver
   */
  private async createNewWeekRecord(
    driverId: string,
  ): Promise<DriverWeeklyEarningsDocument> {
    const weekStart = moment().startOf('isoWeek').toDate();
    const weekEnd = moment().endOf('isoWeek').toDate();

    this.logger.info(
      `Creating new week record for driver ${driverId} (${weekStart.toISOString()} - ${weekEnd.toISOString()})`,
    );

    return this.driverWeeklyEarningsRepository.create({
      driverId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      totalTrips: 0,
      totalDuration: 0,
      totalEarnings: 0,
      trips: [],
      status: 'ACTIVE',
    });
  }

  /**
   * Cron job to handle weekly transitions
   * Runs every Monday at 09:00
   */
  @Cron('0 0 9 * * MON')
  async handleWeeklyTransition(): Promise<void> {
    this.logger.info('Starting weekly transition process...');

    try {
      // 1. Mark all ACTIVE records as COMPLETED and UNPAID
      const updateResult =
        await this.driverWeeklyEarningsRepository.updateManyActiveToCompleted();

      this.logger.info(
        `Marked ${updateResult.modifiedCount} weekly records as COMPLETED`,
      );

      // 2. Get all driver IDs to create new week records
      const allDrivers = await this.getAllDriverIds();

      // 3. Create new ACTIVE records for all drivers
      let createdCount = 0;
      for (const driverId of allDrivers) {
        try {
          await this.createNewWeekRecord(driverId);
          createdCount++;
        } catch (error) {
          this.logger.error(
            `Failed to create week record for driver ${driverId}: ${error.message}`,
          );
        }
      }

      this.logger.info(
        `Weekly transition completed. Created ${createdCount} new week records for ${allDrivers.length} drivers.`,
      );
    } catch (error) {
      this.logger.error(
        `Error during weekly transition: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get all driver IDs
   */
  private async getAllDriverIds(): Promise<string[]> {
    const existingDrivers =
      await this.driverWeeklyEarningsRepository.getDistinctDriverIds();

    this.logger.info(
      `Found ${existingDrivers.length} drivers with earnings records`,
    );
    return existingDrivers;
  }
}
