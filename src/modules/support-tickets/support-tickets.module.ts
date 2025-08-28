import { Module } from '@nestjs/common';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicketsService } from './support-tickets.service';
import { ClientsModule } from 'src/clients/clients.module';
import { S3Module } from 'src/s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [ClientsModule, JwtModule, S3Module, RedisModule],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
})
export class SupportTicketsModule {}
