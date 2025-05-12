import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { ConnectionStatusService } from './connection-status.service';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { WebSocketController } from './websocket.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [JwtModule, RedisModule],
  controllers: [WebSocketController],
  providers: [WebSocketGateway, WebSocketService, ConnectionStatusService],
  exports: [WebSocketService, ConnectionStatusService],
})
export class WebSocketModule {}
