import { Module, forwardRef } from '@nestjs/common';
import { TripRepository } from './repositories/trip.repository';
import { DriverPenaltyRepository } from './repositories/driver-penalty.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Trip, TripSchema } from './schemas/trip.schema';
import {
  UserPenalty,
  UserPenaltySchema,
} from './schemas/driver-penalty.schema';
import { TripService } from './services/trip.service';
import { DriverPenaltyService } from './services/driver-penalty.service';
import { ClientsModule } from 'src/clients/clients.module';
import { ConfigModule } from 'src/config/config.module';
import { MapsModule } from 'src/clients/maps/maps.module';
import { LockModule } from 'src/common/lock/lock.module';
import { TripStateService } from './services/trip-status.service';
import { TripPaymentService } from './services/trip-payment.service';
import { DriversTripsController } from './controllers/driver-trip.controller';
import { CustomersTripsController } from './controllers/customer-trip.controller';
import { DriverPenaltyController } from './controllers/driver-penalty.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from 'src/redis/redis.module';
import { EventModule } from '../event/event.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: UserPenalty.name, schema: UserPenaltySchema },
    ]),
    MapsModule,
    ConfigModule,
    LockModule,
    ClientsModule,
    RedisModule,
    EventModule,
    JwtModule,
    forwardRef(() => PaymentsModule),
  ],
  providers: [
    TripService,
    TripRepository,
    DriverPenaltyRepository,
    DriverPenaltyService,
    TripStateService,
    TripPaymentService,
  ],
  controllers: [
    DriversTripsController,
    CustomersTripsController,
    DriverPenaltyController,
  ],
  exports: [TripService, TripPaymentService, DriverPenaltyService],
})
export class TripModule {}
