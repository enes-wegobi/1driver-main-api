import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthService } from './auth.service';
import { AuthCustomerController } from './auth-customer.controller';
import { AuthDriverController } from './auth-driver.controller';
import { RedisModule } from '../../redis/redis.module';
import { ConfigModule } from '../../config/config.module';
import { JwtModule } from '../../jwt/jwt.module';
import { PaymentsModule } from '../payments/payments.module';
import { DriversModule } from '../drivers/drivers.module';
import { ForceLogoutService } from './force-logout.service';
import { ExpoNotificationsModule } from '../expo-notifications/expo-notifications.module';

@Module({
  imports: [
    ClientsModule,
    RedisModule,
    ConfigModule,
    forwardRef(() => JwtModule),
    ExpoNotificationsModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => DriversModule),
  ],
  controllers: [AuthCustomerController, AuthDriverController],
  providers: [AuthService, ForceLogoutService],
  exports: [AuthService, ForceLogoutService],
})
export class AuthModule {}
