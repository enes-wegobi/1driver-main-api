import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { UsersClient } from './users/users.client';
import { AuthClient } from './auth/auth.client';
import { CustomersClient } from './customer/customers.client';

@Module({
  imports: [ConfigModule],
  providers: [ClientsService, UsersClient, AuthClient, CustomersClient],
  exports: [ClientsService, UsersClient, AuthClient, CustomersClient],
})
export class ClientsModule {}
