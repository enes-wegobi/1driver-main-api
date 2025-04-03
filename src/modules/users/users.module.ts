import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ClientsModule, JwtModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
