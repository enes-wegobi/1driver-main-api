import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { AuthClient } from './auth/auth.client';
import { CustomersClient } from './customer/customers.client';
import { DriversClient } from './driver/drivers.client';
import { PromotionClient } from './promotion/promotion.client';
import { TripClient } from './trip/trip.client';

@Module({
  imports: [ConfigModule],
  providers: [
    ClientsService,
    AuthClient,
    CustomersClient,
    DriversClient,
    PromotionClient,
    TripClient,
  ],
  exports: [
    ClientsService,
    AuthClient,
    CustomersClient,
    DriversClient,
    PromotionClient,
    TripClient,
  ],
})
export class ClientsModule {}
