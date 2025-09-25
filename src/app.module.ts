import { Module, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SentryModule } from '@sentry/nestjs/setup';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
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
import { LocationModule } from './modules/location/location.module';
import { QueueModule } from './queue/queue.module';
import { CommonModule } from './modules/common/common.module';
import { LoggerModule } from './logger/logger.module';
import { RequestIdInterceptor } from './logger/request-id.interceptor';
import { RequestLoggerMiddleware } from './logger/request-logger.middleware';
import { HealthModule } from './modules/health/health.module';
import { TripEventsService } from './events/trip-events.service';
import { TripApprovalHandler } from './events/handlers/trip-approval.handler';
import { AuthEventsModule } from './events/auth-events.module';
import { SMSModule } from './modules/sms/sms.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    ConfigModule,
    LoggerModule,
    JwtModule,
    AuthModule,
    AdminModule,
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
    LocationModule,
    QueueModule,
    CommonModule,
    HealthModule,
    AuthEventsModule,
    SMSModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestIdInterceptor,
    },
    TripEventsService,
    TripApprovalHandler,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
