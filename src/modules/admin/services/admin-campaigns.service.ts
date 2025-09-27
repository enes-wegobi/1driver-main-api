import { Injectable } from '@nestjs/common';
import {
  CampaignsService,
  CreateCampaignDto,
} from '../../campaigns/services/campaigns.service';
import { CampaignDocument } from '../../campaigns/schemas/campaign.schema';
import { CampaignType, CampaignTargetGroup } from '../../campaigns/enums';
import { S3Service } from '../../../s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { AdminCampaignListItemDto, AdminCampaignResponseDto } from '../dto/admin-campaign-response.dto';

@Injectable()
export class AdminCampaignsService {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly s3Service: S3Service,
  ) {}

  async createCampaign(
    createCampaignDto: CreateCampaignDto,
    image?: Express.Multer.File,
  ): Promise<CampaignDocument> {
    let imageUrl: string | undefined;

    if (image) {
      const fileKey = `campaing-photos/${createCampaignDto.code}/${uuidv4()}-${image?.originalname}`;
      await this.s3Service.uploadFileWithKey(image, fileKey);
      imageUrl = this.s3Service.getPublicUrl(fileKey);
    }

    const campaignData = {
      ...createCampaignDto,
      imageUrl,
    };

    return this.campaignsService.create(campaignData);
  }

  async getAllCampaigns(page: number = 1, limit: number = 10, search?: string) {
    const result = await this.campaignsService.findAll(page, limit, search);

    const transformedData: AdminCampaignListItemDto[] = result.data.map((campaign) => ({
      id: campaign._id.toString(),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      code: campaign.code,
      type: campaign.type,
      imageUrl: campaign.imageUrl,
      status: new Date() > campaign.endDate ? 'INACTIVE' : 'ACTIVE',
    }));

    return {
      data: transformedData,
      pagination: result.pagination,
    };
  }

  async getCampaignById(id: string): Promise<AdminCampaignResponseDto> {
    const campaign = await this.campaignsService.findById(id);

    return {
      id: campaign._id.toString(),
      name: campaign.name,
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      code: campaign.code,
      type: campaign.type,
      value: campaign.value,
      imageUrl: campaign.imageUrl,
      targetGroup: campaign.targetGroup,
      description: campaign.description,
      status: new Date() > campaign.endDate ? 'INACTIVE' : 'ACTIVE',
    };
  }

  async deleteCampaign(id: string): Promise<CampaignDocument> {
    return this.campaignsService.deleteById(id);
  }

  getCampaignTypes(): string[] {
    return Object.values(CampaignType);
  }

  getCampaignTargetGroups(): string[] {
    return Object.values(CampaignTargetGroup);
  }
}
