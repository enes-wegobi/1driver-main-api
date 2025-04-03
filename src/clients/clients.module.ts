import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { UsersClient } from './users/users.client';
import { AuthClient } from './auth/auth.client';

@Module({
  imports: [ConfigModule],
  providers: [ClientsService, UsersClient, AuthClient],
  exports: [ClientsService, UsersClient, AuthClient],
})
export class ClientsModule {}
