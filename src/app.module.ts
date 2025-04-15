import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from './jwt/jwt.modulte';
import { CustomersModule } from './modules/customers/customers.module';
import { ContentModule } from './modules/content/content.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';
import { S3Module } from './s3/s3.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    ContentModule,
    WebSocketModule,
    RedisModule,
    S3Module,
  ],
})
export class AppModule {}
