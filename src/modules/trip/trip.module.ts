import { Module, forwardRef } from '@nestjs/common';
import { TripRepository } from './repositories/trip.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Trip, TripSchema } from './schemas/trip.schema';
import { TripService } from './services/trip.service';
import { ClientsModule } from 'src/clients/clients.module';
import { ConfigModule } from 'src/config/config.module';
import { MapsModule } from 'src/clients/maps/maps.module';
import { LockModule } from 'src/common/lock/lock.module';
import { TripStateService } from './services/trip-state.service';
import { DriversTripsController } from './controllers/driver-trip.controller';
import { CustomersTripsController } from './controllers/customer-trip.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from 'src/redis/redis.module';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { EventModule } from '../event/event.module';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([{ name: Trip.name, schema: TripSchema }]),
    MapsModule,
    ConfigModule,
    LockModule,
    ClientsModule,
    RedisModule,
    forwardRef(() => WebSocketModule),
    EventModule,
    JwtModule,
  ],
  providers: [TripService, TripRepository, TripStateService],
  controllers: [DriversTripsController, CustomersTripsController],
  exports: [TripService],
})
export class TripModule {}
