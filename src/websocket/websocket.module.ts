import { Module, forwardRef } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { RedisModule } from '../redis/redis.module';
import { ClientsModule } from '../clients/clients.module';
import { TripModule } from 'src/modules/trip/trip.module';
import { SocketIORedisAdapter } from './adapters/socket-io-redis.adapter';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [
    JwtModule,
    RedisModule,
    ClientsModule,
    forwardRef(() => TripModule),
  ],
  providers: [WebSocketGateway, WebSocketService, SocketIORedisAdapter],
  exports: [WebSocketService, SocketIORedisAdapter],
})
export class WebSocketModule {
  static getSocketIOAdapter(app: any) {
    const adapter = new SocketIORedisAdapter(app);
    return adapter;
  }
}
