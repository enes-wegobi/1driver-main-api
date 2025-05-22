import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from './jwt/jwt.modulte';
import { CustomersModule } from './modules/customers/customers.module';
import { ContentModule } from './modules/content/content.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';
import { S3Module } from './s3/s3.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { TripsModule } from './modules/trips/trips.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ExpoNotificationsModule } from './modules/expo-notifications/expo-notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    AuthModule,
    CustomersModule,
    ContentModule,
    WebSocketModule,
    RedisModule,
    S3Module,
    DriversModule,
    TripsModule,
    NotificationsModule,
    PromotionsModule,
    ExpoNotificationsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
