import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { UsersClient } from './users/users.client';
import { AuthClient } from './auth/auth.client';
import { CustomersClient } from './customer/customers.client';
import { DriversClient } from './driver/drivers.client';

@Module({
  imports: [ConfigModule],
  providers: [
    ClientsService,
    UsersClient,
    AuthClient,
    CustomersClient,
    DriversClient,
  ],
  exports: [
    ClientsService,
    UsersClient,
    AuthClient,
    CustomersClient,
    DriversClient,
  ],
})
export class ClientsModule {}
