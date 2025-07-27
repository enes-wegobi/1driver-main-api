import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { S3Module } from 'src/s3/s3.module';
import { PaymentsModule } from '../payments/payments.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [
    ClientsModule,
    S3Module,
    PaymentsModule,
    JwtModule,
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
