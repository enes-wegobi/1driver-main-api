import { Injectable } from '@nestjs/common';
import {
  CampaignsService,
  CreateCampaignDto,
} from '../../campaigns/services/campaigns.service';
import { CampaignDocument } from '../../campaigns/schemas/campaign.schema';
import { S3Service } from '../../../s3/s3.service';
import { v4 as uuidv4 } from 'uuid';

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
    return this.campaignsService.findAll(page, limit, search);
  }

  async getCampaignById(id: string): Promise<CampaignDocument> {
    return this.campaignsService.findById(id);
  }

  async deleteCampaign(id: string): Promise<CampaignDocument> {
    return this.campaignsService.deleteById(id);
  }
}
