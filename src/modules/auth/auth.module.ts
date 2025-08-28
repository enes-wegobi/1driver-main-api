import { Module, forwardRef } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthDriverController } from './controllers/auth-driver.controller';
import { RedisModule } from '../../redis/redis.module';
import { ConfigModule } from '../../config/config.module';
import { JwtModule } from '../../jwt/jwt.module';
import { PaymentsModule } from '../payments/payments.module';
import { DriversModule } from '../drivers/drivers.module';
import { ForceLogoutService } from './services/force-logout.service';
import { ExpoNotificationsModule } from '../expo-notifications/expo-notifications.module';
import { AuthEventsModule } from '../../events/auth-events.module';
import { SMSModule } from '../sms/sms.module';
import { AuthCustomerController } from './controllers/auth-customer.controller';
import { AuthService } from './services/auth.service';

@Module({
  imports: [
    ClientsModule,
    RedisModule,
    ConfigModule,
    forwardRef(() => JwtModule),
    ExpoNotificationsModule,
    forwardRef(() => PaymentsModule),
    forwardRef(() => DriversModule),
    AuthEventsModule,
    SMSModule,
  ],
  controllers: [AuthCustomerController, AuthDriverController],
  providers: [AuthService, ForceLogoutService],
  exports: [AuthService, ForceLogoutService],
})
export class AuthModule {}
