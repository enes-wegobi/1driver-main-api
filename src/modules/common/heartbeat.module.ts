import { Module } from '@nestjs/common';
import { HeartbeatController } from './heartbeat.controller';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [RedisModule, JwtModule],
  controllers: [HeartbeatController],
})
export class HeartbeatModule {}
