import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { S3Module } from 'src/s3/s3.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { SupportTicketsModule } from '../support-tickets/support-tickets.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    ClientsModule,
    S3Module,
    JwtModule,
    SupportTicketsModule,
    RedisModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
