import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { CampaignRepository } from './repositories/campaign.repository';
import { CampaignsService } from './services/campaigns.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
    ]),
  ],
  providers: [CampaignRepository, CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
