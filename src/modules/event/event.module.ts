import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { RedisModule } from 'src/redis/redis.module';
import { DriversModule } from 'src/modules/drivers/drivers.module';
import { CustomersModule } from 'src/modules/customers/customers.module';
import { ExpoNotificationsModule } from 'src/modules/expo-notifications/expo-notifications.module';
import { MapsModule } from 'src/clients/maps/maps.module';
import { S3Module } from 'src/s3/s3.module';
import { Event2Service } from './event_v2.service';
import { TripModule } from '../trip/trip.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => WebSocketModule),
    forwardRef(() => TripModule),
    RedisModule,
    DriversModule,
    CustomersModule,
    ExpoNotificationsModule,
    MapsModule,
    S3Module,
  ],
  providers: [Event2Service],
  exports: [Event2Service],
})
export class EventModule {}
