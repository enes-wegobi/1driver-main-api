import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthService } from './auth.service';
import { AuthCustomerController } from './auth-customer.controller';
import { AuthDriverController } from './auth-driver.controller';

@Module({
  imports: [ClientsModule],
  controllers: [AuthCustomerController, AuthDriverController],
  providers: [AuthService],
})
export class AuthModule {}
