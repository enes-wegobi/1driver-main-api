import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ClientsModule, JwtModule],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
