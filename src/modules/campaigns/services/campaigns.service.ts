import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CampaignRepository } from '../repositories/campaign.repository';
import { Campaign, CampaignDocument } from '../schemas/campaign.schema';
import { CampaignTargetGroup, CampaignType } from '../enums';

export interface CreateCampaignDto {
  name: string;
  startDate: Date;
  endDate: Date;
  code: string;
  type: CampaignType;
  imageUrl?: string;
  value: number;
  targetGroup: CampaignTargetGroup;
  description?: string;
}

@Injectable()
export class CampaignsService {
  constructor(private readonly campaignRepository: CampaignRepository) {}

  async create(
    createCampaignDto: CreateCampaignDto,
  ): Promise<CampaignDocument> {
    const existingCampaign = await this.campaignRepository.findByCode(
      createCampaignDto.code,
    );
    if (existingCampaign) {
      throw new ConflictException('Campaign with this code already exists');
    }

    if (createCampaignDto.startDate >= createCampaignDto.endDate) {
      throw new ConflictException('End date must be after start date');
    }

    return this.campaignRepository.create(createCampaignDto);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const [campaigns, total] = await Promise.all([
      this.campaignRepository.findAll(page, limit, search),
      this.campaignRepository.count(search),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findById(id: string): Promise<CampaignDocument> {
    const campaign = await this.campaignRepository.findById(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async deleteById(id: string): Promise<CampaignDocument> {
    const campaign = await this.campaignRepository.deleteById(id);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async findActiveCampaigns(): Promise<CampaignDocument[]> {
    return this.campaignRepository.findActiveCampaigns();
  }

  async findByTargetGroup(
    targetGroup: CampaignTargetGroup,
  ): Promise<CampaignDocument[]> {
    return this.campaignRepository.findByTargetGroup(targetGroup);
  }

  async findByCode(code: string): Promise<CampaignDocument | null> {
    return this.campaignRepository.findByCode(code);
  }
}
