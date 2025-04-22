import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [WebSocketModule, RedisModule, JwtModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
