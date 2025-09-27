import { Injectable } from '@nestjs/common';
import { TripService } from '../../trip/services/trip.service';
import { TripStatus } from '../../../common/enums/trip-status.enum';
import { TripCostSummaryService } from '../../trip/services/trip-cost-summary.service';
import { CustomersService } from '../../customers/customers.service';
import { DriversService } from '../../drivers/services/drivers.service';
import { AdminStatisticsResponseDto } from '../dto/admin-statistics-response.dto';
import { GetStatisticsQueryDto } from '../dto/get-statistics-query.dto';

@Injectable()
export class AdminStatisticsService {
  constructor(
    private readonly tripService: TripService,
    private readonly tripCostSummaryService: TripCostSummaryService,
    private readonly customersService: CustomersService,
    private readonly driversService: DriversService,
  ) {}

  async getStatistics(query: GetStatisticsQueryDto): Promise<AdminStatisticsResponseDto> {
    const { startDate, endDate } = this.buildDateRange(query);

    const [
      totalTrips,
      completedTrips,
      totalDrivers,
      totalCustomers,
      costSummaries,
    ] = await Promise.all([
      this.getTotalTrips(startDate, endDate),
      this.getCompletedTrips(startDate, endDate),
      this.getTotalDriversCount(),
      this.getTotalCustomersCount(),
      this.tripCostSummaryService.getAllCostSummaries(startDate, endDate),
    ]);

    return {
      totalTrips,
      completedTrips,
      totalDrivers,
      totalCustomers,
      costSummaries,
    };
  }

  private buildDateRange(query: GetStatisticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();

    let startDate: Date;
    let endDate: Date;

    if (query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      endDate = new Date(query.endDate);
    } else {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  private async getTotalTrips(startDate: Date, endDate: Date): Promise<number> {
    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };
    return this.tripService.count(filter);
  }

  private async getCompletedTrips(startDate: Date, endDate: Date): Promise<number> {
    const filter = {
      status: TripStatus.COMPLETED,
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };
    return this.tripService.count(filter);
  }

  private async getTotalDriversCount(): Promise<number> {
    const driversResponse = await this.driversService.findAll({ page: 1, limit: 1 });
    return driversResponse.total || 0;
  }

  private async getTotalCustomersCount(): Promise<number> {
    const customersResponse = await this.customersService.findAll({ page: 1, limit: 1 });
    return customersResponse.total || 0;
  }
}