import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { UsersClient } from './users/users.client';

@Module({
  imports: [ConfigModule],
  providers: [ClientsService, UsersClient],
  exports: [ClientsService, UsersClient],
})
export class ClientsModule {}
