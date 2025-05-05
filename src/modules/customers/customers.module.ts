import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [ClientsModule, JwtModule, WebSocketModule, RedisModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
