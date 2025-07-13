import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { RedisModule } from '../redis/redis.module';
import { ExpoNotificationsModule } from '../modules/expo-notifications/expo-notifications.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { AuthEventsService } from './auth-events.service';
import { AuthEventsHandler } from './handlers/auth-events.handler';

@Module({
  imports: [
    LoggerModule,
    RedisModule,
    ExpoNotificationsModule,
    WebSocketModule,
  ],
  providers: [AuthEventsService, AuthEventsHandler],
  exports: [AuthEventsService],
})
export class AuthEventsModule {}