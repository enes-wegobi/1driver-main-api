import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthService } from './auth.service';
import { AuthCustomerController } from './auth-customer.controller';
import { AuthDriverController } from './auth-driver.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [ClientsModule, PaymentsModule],
  controllers: [AuthCustomerController, AuthDriverController],
  providers: [AuthService],
})
export class AuthModule {}
