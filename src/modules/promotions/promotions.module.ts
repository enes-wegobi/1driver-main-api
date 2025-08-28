import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { S3Module } from 'src/s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [ClientsModule, JwtModule, S3Module, RedisModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
