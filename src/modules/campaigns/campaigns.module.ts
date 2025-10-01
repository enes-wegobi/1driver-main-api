import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from './schemas/campaign.schema';
import { CampaignRepository } from './repositories/campaign.repository';
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
    ]),
    TripModule,
    JwtModule,
    RedisModule,
  ],
  controllers: [CustomerCampaignsController],
  providers: [CampaignRepository, CampaignsService, CampaignEligibilityService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
