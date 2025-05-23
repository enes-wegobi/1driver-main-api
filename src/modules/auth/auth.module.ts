import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthService } from './auth.service';
import { AuthCustomerController } from './auth-customer.controller';
import { AuthDriverController } from './auth-driver.controller';
import { RedisModule } from '../../redis/redis.module';
import { ConfigModule } from '../../config/config.module';
import { JwtModule } from '../../jwt/jwt.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    ClientsModule, 
    RedisModule, 
    ConfigModule, 
    JwtModule, 
    forwardRef(() => PaymentsModule)
  ],
  controllers: [AuthCustomerController, AuthDriverController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
