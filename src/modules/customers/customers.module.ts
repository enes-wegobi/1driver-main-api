import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { RedisModule } from 'src/redis/redis.module';
import { S3Module } from 'src/s3/s3.module';
import { SupportTicketsModule } from 'src/modules/support-tickets/support-tickets.module';

@Module({
  imports: [
    ClientsModule,
    JwtModule,
    RedisModule,
    S3Module,
    SupportTicketsModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
