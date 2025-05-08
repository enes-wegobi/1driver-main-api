import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [ClientsModule, JwtModule, S3Module],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
