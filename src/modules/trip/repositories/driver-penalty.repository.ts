import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserPenalty,
  UserPenaltyDocument,
  PenaltyStatus,
} from '../schemas/penalty.schema';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class DriverPenaltyRepository {
  constructor(
    @InjectModel(UserPenalty.name)
    private readonly userPenaltyModel: Model<UserPenaltyDocument>,
  ) {}

  async create(
    penaltyData: Partial<UserPenalty>,
  ): Promise<UserPenaltyDocument> {
    const penalty = new this.userPenaltyModel(penaltyData);
    return penalty.save();
  }

  async findByUserId(
    userId: string,
    userType?: UserType,
  ): Promise<UserPenaltyDocument[]> {
    const filter: any = { userId };
    if (userType) {
      filter.userType = userType;
    }
    return this.userPenaltyModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findByDriverId(driverId: string): Promise<UserPenaltyDocument[]> {
    return this.findByUserId(driverId, UserType.DRIVER);
  }

  async findByCustomerId(customerId: string): Promise<UserPenaltyDocument[]> {
    return this.findByUserId(customerId, UserType.CUSTOMER);
  }

  async findByTripId(tripId: string): Promise<UserPenaltyDocument | null> {
    return this.userPenaltyModel.findOne({ tripId }).exec();
  }

  async findUnpaidPenalties(
    userId: string,
    userType?: UserType,
  ): Promise<UserPenaltyDocument[]> {
    const filter: any = { userId, status: PenaltyStatus.PENDING_PAYMENT };
    if (userType) {
      filter.userType = userType;
    }
    return this.userPenaltyModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async markAsPaid(penaltyId: string): Promise<UserPenaltyDocument | null> {
    return this.userPenaltyModel
      .findByIdAndUpdate(
        penaltyId,
        { status: PenaltyStatus.PAID, paidAt: new Date() },
        { new: true },
      )
      .exec();
  }

  async findByUserIdAndStatus(
    userId: string,
    userType: UserType,
    status: PenaltyStatus,
  ): Promise<UserPenaltyDocument[]> {
    return this.userPenaltyModel
      .find({ userId, userType, status })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(
    penaltyId: string,
    status: PenaltyStatus,
  ): Promise<UserPenaltyDocument | null> {
    const updateData: any = { status };
    if (status === PenaltyStatus.PAID) {
      updateData.paidAt = new Date();
    }

    return this.userPenaltyModel
      .findByIdAndUpdate(penaltyId, updateData, { new: true })
      .exec();
  }
}
