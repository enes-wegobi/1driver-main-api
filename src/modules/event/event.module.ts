import { Module, forwardRef } from '@nestjs/common';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { RedisModule } from 'src/redis/redis.module';
import { DriversModule } from 'src/modules/drivers/drivers.module';
import { CustomersModule } from 'src/modules/customers/customers.module';
import { ExpoNotificationsModule } from 'src/modules/expo-notifications/expo-notifications.module';
import { MapsModule } from 'src/clients/maps/maps.module';
import { S3Module } from 'src/s3/s3.module';
import { EventService } from './event.service';
import { Event2Service } from './event_v2.service';

@Module({
  imports: [
    forwardRef(() => WebSocketModule),
    RedisModule,
    DriversModule,
    CustomersModule,
    ExpoNotificationsModule,
    MapsModule,
    S3Module,
  ],
  providers: [EventService, Event2Service],
  exports: [EventService, Event2Service],
})
export class EventModule {}
