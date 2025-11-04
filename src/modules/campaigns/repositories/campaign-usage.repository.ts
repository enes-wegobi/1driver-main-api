import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CampaignUsage,
  CampaignUsageDocument,
} from '../schemas/campaign-usage.schema';

@Injectable()
export class CampaignUsageRepository {
  constructor(
    @InjectModel(CampaignUsage.name)
    private campaignUsageModel: Model<CampaignUsageDocument>,
  ) {}

  async create(data: {
    campaignId: Types.ObjectId;
    tripId: Types.ObjectId;
    customerId: string;
    discountAmount: number;
  }): Promise<CampaignUsageDocument> {
    const campaignUsage = new this.campaignUsageModel({
      ...data,
      appliedAt: new Date(),
    });
    return campaignUsage.save();
  }

  async findByTripId(tripId: string): Promise<CampaignUsageDocument | null> {
    return this.campaignUsageModel.findOne({ tripId: new Types.ObjectId(tripId) }).exec();
  }

  async deleteByTripId(tripId: string): Promise<CampaignUsageDocument | null> {
    return this.campaignUsageModel
      .findOneAndDelete({ tripId: new Types.ObjectId(tripId) })
      .exec();
  }

  async countByCampaignId(campaignId: string): Promise<number> {
    return this.campaignUsageModel
      .countDocuments({ campaignId: new Types.ObjectId(campaignId) })
      .exec();
  }

  async findByCustomerId(customerId: string): Promise<CampaignUsageDocument[]> {
    return this.campaignUsageModel.find({ customerId }).exec();
  }
}
