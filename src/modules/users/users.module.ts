import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [ClientsModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
