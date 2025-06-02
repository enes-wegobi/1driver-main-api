import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from '../schemas/trip.schema';
import { UpdateTripDto } from '../dto/update-trip.dto';
import { CreateTripDto } from '../dto/create-trip.dto';
import { TripStatus } from 'src/common/enums/trip-status.enum';

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
}
