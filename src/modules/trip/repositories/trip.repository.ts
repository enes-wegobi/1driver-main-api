import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { UpdateTripDto } from '../dto/update-trip.dto';
import { CreateTripDto } from '../dto/create-trip.dto';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { TripHistoryQueryDto } from '../dto/trip-history-query.dto';

export interface TripHistoryResult {
  trips: TripDocument[];
  total: number;
}

export interface DriverStatisticsResult {
  completedTrips: number;
  totalEarnings: number;
  totalDuration: number;
}

@Injectable()
export class TripRepository {
  constructor(
    @InjectModel(Trip.name)
    private readonly tripModel: Model<TripDocument>,
  ) {}

  async createTrip(tripData: CreateTripDto): Promise<TripDocument> {
    const createdTrip = new this.tripModel({
      ...tripData,
    });
    const savedTrip = await createdTrip.save();
    return savedTrip.toObject();
  }

  async findById(id: string): Promise<TripDocument | null> {
    return this.tripModel.findById(id).lean();
  }

  async findByIdAndUpdate(
    id: string,
    tripData: UpdateTripDto,
  ): Promise<TripDocument | null> {
    return this.tripModel
      .findByIdAndUpdate(
        id,
        {
          ...tripData,
        },
        { new: true },
      )
      .lean();
  }

  async findLatestPendingByCustomerId(
    customerId: string,
  ): Promise<TripDocument | null> {
    return this.tripModel
      .findOne({
        'customer.id': customerId,
        status: TripStatus.DRAFT,
        driver: null,
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findActiveByCustomerId(
    customerId: string,
  ): Promise<TripDocument | null> {
    return this.tripModel
      .findOne({
        'customer.id': customerId,
        status: {
          $in: [
            TripStatus.WAITING_FOR_DRIVER,
            TripStatus.APPROVED,
            TripStatus.DRIVER_ON_WAY_TO_PICKUP,
            TripStatus.ARRIVED_AT_PICKUP,
            TripStatus.TRIP_IN_PROGRESS,
            TripStatus.PAYMENT,
            TripStatus.PAYMENT_RETRY,
            TripStatus.CANCELLED_PAYMENT,
          ],
        },
      })
      .lean()
      .exec();
  }

  async findActiveByDriverId(driverId: string): Promise<TripDocument | null> {
    return this.tripModel
      .findOne({
        'driver.id': driverId,
        status: {
          $in: [
            TripStatus.APPROVED,
            TripStatus.DRIVER_ON_WAY_TO_PICKUP,
            TripStatus.ARRIVED_AT_PICKUP,
            TripStatus.TRIP_IN_PROGRESS,
            TripStatus.PAYMENT,
          ],
        },
      })
      .lean()
      .exec();
  }

  async findTripStatusById(id: string): Promise<TripStatus | null> {
    const trip = await this.tripModel
      .findById(id)
      .select('status')
      .lean()
      .exec();
    return trip ? trip.status : null;
  }

  async findTimedOutTrips(timeoutSeconds: number): Promise<TripDocument[]> {
    const timeoutDate = new Date(Date.now() - timeoutSeconds * 1000);

    return this.tripModel
      .find({
        status: TripStatus.WAITING_FOR_DRIVER,
        callStartTime: { $lt: timeoutDate },
      })
      .lean()
      .exec();
  }

  async findTripHistoryByCustomerId(
    customerId: string,
    queryOptions: TripHistoryQueryDto,
  ): Promise<TripHistoryResult> {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryOptions;

    // Build filter query
    const filter: any = {
      'customer.id': customerId,
      status: {
        $in: [TripStatus.COMPLETED, TripStatus.CANCELLED],
      },
    };

    // Add status filter if specified
    if (status) {
      filter.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [trips, total] = await Promise.all([
      this.tripModel
        .find(filter)
        .select('_id status route tripStartTime tripEndTime finalCost actualDuration')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.tripModel.countDocuments(filter).exec(),
    ]);

    return { trips, total };
  }

  async findTripHistoryByDriverId(
    driverId: string,
    queryOptions: TripHistoryQueryDto,
  ): Promise<TripHistoryResult> {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryOptions;

    // Build filter query
    const filter: any = {
      'driver.id': driverId,
      status: {
        $in: [TripStatus.COMPLETED, TripStatus.CANCELLED],
      },
    };

    // Add status filter if specified
    if (status) {
      filter.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [trips, total] = await Promise.all([
      this.tripModel
        .find(filter)
        .select('_id status route tripStartTime tripEndTime finalCost actualDuration')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.tripModel.countDocuments(filter).exec(),
    ]);

    return { trips, total };
  }

  async getDriverStatisticsByDateRange(
    driverId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DriverStatisticsResult> {
    const pipeline = [
      {
        $match: {
          'driver.id': driverId,
          status: TripStatus.COMPLETED,
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          completedTrips: { $sum: 1 },
          totalEarnings: { $sum: '$finalCost' },
          totalDuration: { $sum: '$actualDuration' },
        },
      },
    ];

    const result = await this.tripModel.aggregate(pipeline).exec();

    if (result.length === 0) {
      return {
        completedTrips: 0,
        totalEarnings: 0,
        totalDuration: 0,
      };
    }

    return {
      completedTrips: result[0].completedTrips || 0,
      totalEarnings: result[0].totalEarnings || 0,
      totalDuration: result[0].totalDuration || 0,
    };
  }
}
