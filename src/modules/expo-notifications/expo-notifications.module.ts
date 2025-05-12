import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { ExpoNotificationsService } from './expo-notifications.service';
import { ExpoNotificationsController } from './expo-notifications.controller';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ConfigModule, JwtModule],
  controllers: [ExpoNotificationsController],
  providers: [ExpoNotificationsService],
  exports: [ExpoNotificationsService],
})
export class ExpoNotificationsModule {}
