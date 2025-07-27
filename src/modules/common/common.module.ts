import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { CommonController } from './common.controller';

@Module({
  imports: [RedisModule, JwtModule],
  controllers: [CommonController],
})
export class CommonModule {}
