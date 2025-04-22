import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
