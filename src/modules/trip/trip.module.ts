import { Module } from '@nestjs/common';
import { TripRepository } from './trip.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Trip, TripSchema } from './schemas/trip.schema';
import { TripService } from './trip.service';
import { TripController } from './trip.controller';
import { TripStateService } from './trip-state.service';
import { ClientsModule } from 'src/clients/clients.module';
import { ConfigModule } from 'src/config/config.module';
import { MapsModule } from 'src/clients/maps/maps.module';
import { LockModule } from 'src/common/lock/lock.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Trip.name, schema: TripSchema }]),
    MapsModule,
    ConfigModule,
    LockModule,
    ClientsModule,
  ],
  providers: [TripService, TripRepository, TripStateService],
  controllers: [TripController],
  exports: [TripService],
})
export class TripModule {}
