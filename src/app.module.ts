import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from './jwt/jwt.modulte';
import { CustomersModule } from './modules/customers/customers.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    WebSocketModule,
    RedisModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}