import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { CampaignUsage, CampaignUsageSchema } from './schemas/campaign-usage.schema';
import { CampaignRepository } from './repositories/campaign.repository';
import { CampaignUsageRepository } from './repositories/campaign-usage.repository';
import { CampaignsService } from './services/campaigns.service';
import { CampaignEligibilityService } from './services/campaign-eligibility.service';
import { CustomerCampaignsController } from './controllers/customer-campaigns.controller';
import { TripModule } from '../trip/trip.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
      { name: CampaignUsage.name, schema: CampaignUsageSchema },
    ]),
    forwardRef(() => TripModule),
    JwtModule,
    RedisModule,
  ],
  controllers: [CustomerCampaignsController],
  providers: [CampaignRepository, CampaignUsageRepository, CampaignsService, CampaignEligibilityService],
  exports: [CampaignsService, CampaignUsageRepository, CampaignEligibilityService],
})
export class CampaignsModule {}
