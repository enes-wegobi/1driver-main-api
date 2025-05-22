import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trip, TripDocument } from './schemas/trip.schema';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateTripDto } from './dto/create-trip.dto';
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
    return createdTrip.save();
  }

  async findById(id: string): Promise<TripDocument | null> {
    return this.tripModel.findById(id);
  }

  async findByIdAndUpdate(
    id: string,
    tripData: UpdateTripDto,
  ): Promise<TripDocument | null> {
    return this.tripModel.findByIdAndUpdate(
      id,
      {
        ...tripData,
      },
      { new: true },
    );
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
      .exec();
  }

  async findActiveByCustomerId(
    customerId: string,
  ): Promise<TripDocument | null> {
    return this.tripModel
      .findOne({
        'customer.id': customerId,
        status: TripStatus.WAITING_FOR_DRIVER,
      })
      .exec();
  }

  async findActiveByDriverId(driverId: string): Promise<TripDocument | null> {
    return this.tripModel
      .findOne({
        'driver.id': driverId,
        status: TripStatus.APPROVED,
      })
      .exec();
  }
}
