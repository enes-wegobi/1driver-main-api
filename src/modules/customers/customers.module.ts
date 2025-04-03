import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ClientsModule, JwtModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
