import { Module } from '@nestjs/common';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { ConfigModule } from 'src/config/config.module';
import { LoggerModule } from 'src/logger/logger.module';
import { CommonController } from './common.controller';

@Module({
  imports: [RedisModule, JwtModule, ConfigModule, LoggerModule],
  controllers: [CommonController],
  providers: [],
})
export class CommonModule {}
