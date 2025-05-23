import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { S3Module } from 'src/s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [ClientsModule, JwtModule, S3Module, RedisModule],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
