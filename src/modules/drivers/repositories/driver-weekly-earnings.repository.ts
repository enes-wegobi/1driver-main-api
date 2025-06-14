import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DriverWeeklyEarnings,
  DriverWeeklyEarningsDocument,
  TripEarningDetail,
} from '../schemas/driver-weekly-earnings.schema';

@Injectable()
export class DriverWeeklyEarningsRepository {
  constructor(
    @InjectModel(DriverWeeklyEarnings.name)
    private readonly model: Model<DriverWeeklyEarningsDocument>,
  ) {}

  async create(
    data: Partial<DriverWeeklyEarnings>,
  ): Promise<DriverWeeklyEarningsDocument> {
    return this.model.create(data);
  }

  async findOne(
    filter: Partial<DriverWeeklyEarnings>,
  ): Promise<DriverWeeklyEarningsDocument | null> {
    return this.model.findOne(filter).exec();
  }

  async findActiveByDriverId(
    driverId: string,
  ): Promise<DriverWeeklyEarningsDocument | null> {
    return this.model.findOne({ driverId, status: 'ACTIVE' }).exec();
  }

  async findCompletedByDriverId(
    driverId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'weekStartDate',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<DriverWeeklyEarningsDocument[]> {
    const skip = (page - 1) * limit;
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    return this.model
      .find({ driverId, status: 'COMPLETED' })
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countCompletedByDriverId(driverId: string): Promise<number> {
    return this.model.countDocuments({ driverId, status: 'COMPLETED' }).exec();
  }

  async addTripToWeeklyRecord(
    recordId: string,
    tripDetail: TripEarningDetail,
  ): Promise<void> {
    await this.model.updateOne(
      { _id: recordId },
      {
        $push: { trips: tripDetail },
        $inc: {
          totalTrips: 1,
          totalDuration: tripDetail.duration,
          totalEarnings: tripDetail.earnings,
        },
        updatedAt: new Date(),
      },
    );
  }

  async updateManyActiveToCompleted(): Promise<{ modifiedCount: number }> {
    const result = await this.model.updateMany(
      { status: 'ACTIVE' },
      {
        status: 'COMPLETED',
        paymentStatus: 'UNPAID',
      },
    );
    return { modifiedCount: result.modifiedCount || 0 };
  }

  async getDistinctDriverIds(): Promise<string[]> {
    return this.model.distinct('driverId').exec();
  }
}
