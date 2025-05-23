import { Module } from '@nestjs/common';
import { ConfigModule } from 'src/config/config.module';
import { ExpoNotificationsService } from './expo-notifications.service';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [ConfigModule, JwtModule],
  providers: [ExpoNotificationsService],
  exports: [ExpoNotificationsService],
})
export class ExpoNotificationsModule {}
