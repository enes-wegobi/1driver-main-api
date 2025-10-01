import { Module, forwardRef } from '@nestjs/common';
import { TripRepository } from './repositories/trip.repository';
import { TripCostSummaryRepository } from './repositories/trip-cost-summary.repository';
import { DriverPenaltyRepository } from './repositories/driver-penalty.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Trip, TripSchema } from './schemas/trip.schema';
import { TripCostSummary, TripCostSummarySchema } from './schemas/trip-cost-summary.schema';
import { UserPenalty, UserPenaltySchema } from './schemas/penalty.schema';
import { TripService } from './services/trip.service';
import { TripCostSummaryService } from './services/trip-cost-summary.service';
import { DriverPenaltyService } from './services/driver-penalty.service';
import { ClientsModule } from 'src/clients/clients.module';
import { ConfigModule } from 'src/config/config.module';
import { MapsModule } from 'src/clients/maps/maps.module';
import { TripStatusService } from './services/trip-status.service';
import { TripPaymentService } from './services/trip-payment.service';
import { DriversTripsController } from './controllers/driver-trip.controller';
import { CustomersTripsController } from './controllers/customer-trip.controller';
import { DriverPenaltyController } from './controllers/driver-penalty.controller';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from 'src/redis/redis.module';
import { EventModule } from '../event/event.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { PaymentsModule } from '../payments/payments.module';
import { QueueModule } from '../../queue/queue.module';
import { DriversModule } from '../drivers/drivers.module';
import { LockModule } from 'src/lock/lock.module';
import { TripEventsService } from '../../events/trip-events.service';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Trip.name, schema: TripSchema },
      { name: TripCostSummary.name, schema: TripCostSummarySchema },
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
    forwardRef(() => QueueModule),
    forwardRef(() => DriversModule),
    forwardRef(() => CampaignsModule),
  ],
  providers: [
    TripService,
    TripRepository,
    TripCostSummaryRepository,
    TripCostSummaryService,
    DriverPenaltyRepository,
    DriverPenaltyService,
    TripStatusService,
    TripPaymentService,
    TripEventsService,
  ],
  controllers: [
    DriversTripsController,
    CustomersTripsController,
    DriverPenaltyController,
  ],
  exports: [TripService, TripCostSummaryService, TripPaymentService, DriverPenaltyService],
})
export class TripModule {}
