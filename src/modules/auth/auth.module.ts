import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthService } from './auth.service';
import { AuthCustomerController } from './auth-customer.controller';
import { AuthDriverController } from './auth-driver.controller';
import { RedisModule } from '../../redis/redis.module';
import { ConfigModule } from '../../config/config.module';
import { JwtModule } from '../../jwt/jwt.module';

@Module({
  imports: [ClientsModule, RedisModule, ConfigModule, JwtModule],
  controllers: [AuthCustomerController, AuthDriverController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
