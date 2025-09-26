import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { AuthClient } from './auth/auth.client';
import { CustomersClient } from './customer/customers.client';
import { DriversClient } from './driver/drivers.client';

@Module({
  imports: [ConfigModule],
  providers: [ClientsService, AuthClient, CustomersClient, DriversClient],
  exports: [ClientsService, AuthClient, CustomersClient, DriversClient],
})
export class ClientsModule {}
