import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from './jwt/jwt.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ContentModule } from './modules/content/content.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';
import { S3Module } from './s3/s3.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ExpoNotificationsModule } from './modules/expo-notifications/expo-notifications.module';
import { TripModule } from './modules/trip/trip.module';
import { SupportTicketsModule } from './modules/support-tickets/support-tickets.module';
import { TestModule } from './modules/test/test.module';
import { LocationModule } from './modules/location/location.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    JwtModule,
    AuthModule,
    CustomersModule,
    ContentModule,
    WebSocketModule,
    RedisModule,
    S3Module,
    DriversModule,
    TripModule,
    PromotionsModule,
    ExpoNotificationsModule,
    SupportTicketsModule,
    TestModule,
    LocationModule,
  ],
})
export class AppModule {}
