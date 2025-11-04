import { Injectable } from '@nestjs/common';
import { TripCostSummaryRepository, CreateTripCostSummaryDto } from '../repositories/trip-cost-summary.repository';
import { TripDocument } from '../schemas/trip.schema';
import { TripCostSummaryDocument } from '../schemas/trip-cost-summary.schema';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class TripCostSummaryService {
  constructor(
    private readonly costSummaryRepository: TripCostSummaryRepository,
    private readonly logger: LoggerService,
  ) {}

  async createFromCompletedTrip(trip: TripDocument): Promise<TripCostSummaryDocument | null> {
    try {
      const exists = await this.costSummaryRepository.exists(trip._id.toString());
      if (exists) {
        this.logger.warn(`Cost summary already exists for trip ${trip._id}`);
        return null;
      }

      if (!trip.driver) {
        this.logger.error(`Cannot create cost summary for trip ${trip._id} - no driver assigned`);
        return null;
      }

      const costSummaryData: CreateTripCostSummaryDto = {
        tripId: trip._id.toString(),
        customerId: trip.customer.id,
        driverId: trip.driver.id,
        finalCost: trip.finalCost || 0,
        completedAt: trip.tripEndTime || new Date(),
      };

      const costSummary = await this.costSummaryRepository.create(costSummaryData);

      this.logger.info(
        `Created cost summary for trip ${trip._id}: ${costSummary.finalCost} AED`,
      );

      return costSummary;
    } catch (error) {
      this.logger.error(
        `Failed to create cost summary for trip ${trip._id}: ${error.message}`,
      );
      throw error;
    }
  }

  async getAllCostSummaries(startDate?: Date, endDate?: Date): Promise<TripCostSummaryDocument[]> {
    return this.costSummaryRepository.getAllCostSummaries(startDate, endDate);
  }
}