import { Module } from '@nestjs/common';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { RedisModule } from 'src/redis/redis.module';
import { DriversModule } from 'src/modules/drivers/drivers.module';
import { CustomersModule } from 'src/modules/customers/customers.module';
import { ExpoNotificationsModule } from 'src/modules/expo-notifications/expo-notifications.module';
import { EventService } from './event.service';

@Module({
  imports: [
    WebSocketModule,
    RedisModule,
    DriversModule,
    CustomersModule,
    ExpoNotificationsModule,
  ],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {}
