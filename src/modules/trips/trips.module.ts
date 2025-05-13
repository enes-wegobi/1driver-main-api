import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { DriversTripsController } from './driver-trip.controller';
import { ClientsModule } from 'src/clients/clients.module';
import { CustomersTripsController } from './customer-trip.controller';
import { EventModule } from 'src/modules/event/event.module';

@Module({
  imports: [
    ClientsModule,
    WebSocketModule,
    RedisModule,
    JwtModule,
    EventModule,
  ],
  controllers: [DriversTripsController, CustomersTripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
