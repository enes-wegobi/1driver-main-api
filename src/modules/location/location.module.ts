import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { RedisModule } from 'src/redis/redis.module';
import { TripModule } from 'src/modules/trip/trip.module';
import { WebSocketModule } from 'src/websocket/websocket.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [RedisModule, TripModule, WebSocketModule, JwtModule],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
