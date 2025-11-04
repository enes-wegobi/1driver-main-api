import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TripCostSummary, TripCostSummaryDocument } from '../schemas/trip-cost-summary.schema';

export interface CreateTripCostSummaryDto {
  tripId: string;
  customerId: string;
  driverId: string;
  finalCost: number;
  completedAt: Date;
}

@Injectable()
export class TripCostSummaryRepository {
  constructor(
    @InjectModel(TripCostSummary.name)
    private readonly costSummaryModel: Model<TripCostSummaryDocument>,
  ) {}

  async create(data: CreateTripCostSummaryDto): Promise<TripCostSummaryDocument> {
    const costSummary = new this.costSummaryModel({
      ...data,
      tripId: new Types.ObjectId(data.tripId),
    });
    const saved = await costSummary.save();
    return saved.toObject();
  }

  async exists(tripId: string): Promise<boolean> {
    const count = await this.costSummaryModel.countDocuments({
      tripId: new Types.ObjectId(tripId),
    });
    return count > 0;
  }


  async getAllCostSummaries(startDate?: Date, endDate?: Date): Promise<TripCostSummaryDocument[]> {
    const filter: any = {};

    if (startDate || endDate) {
      filter.completedAt = {};
      if (startDate) filter.completedAt.$gte = startDate;
      if (endDate) filter.completedAt.$lte = endDate;
    }

    return this.costSummaryModel.find(filter).sort({ completedAt: -1 }).lean();
  }
}