import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Campaign, CampaignDocument } from '../schemas/campaign.schema';
import { CampaignTargetGroup } from '../enums';

@Injectable()
export class CampaignRepository {
  constructor(
    @InjectModel(Campaign.name)
    private campaignModel: Model<CampaignDocument>,
  ) {}

  async create(campaignData: Partial<Campaign>): Promise<CampaignDocument> {
    const campaign = new this.campaignModel(campaignData);
    return campaign.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<CampaignDocument[]> {
    const skip = (page - 1) * limit;

    let query: any = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
    }

    return this.campaignModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async count(search?: string): Promise<number> {
    let query: any = {};

    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      };
    }

    return this.campaignModel.countDocuments(query).exec();
  }

  async findById(id: string): Promise<CampaignDocument | null> {
    return this.campaignModel.findById(id).exec();
  }

  async findByCode(code: string): Promise<CampaignDocument | null> {
    return this.campaignModel.findOne({ code }).exec();
  }

  async deleteById(id: string): Promise<CampaignDocument | null> {
    return this.campaignModel.findByIdAndDelete(id).exec();
  }

  async findActiveCampaigns(): Promise<CampaignDocument[]> {
    const now = new Date();
    return this.campaignModel
      .find({
        startDate: { $lte: now },
        endDate: { $gt: now },
      })
      .exec();
  }

  async findByTargetGroup(
    targetGroup: CampaignTargetGroup,
  ): Promise<CampaignDocument[]> {
    const now = new Date();
    return this.campaignModel
      .find({
        targetGroup,
        startDate: { $lte: now },
        endDate: { $gt: now },
      })
      .exec();
  }
}
