import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [ClientsModule, JwtModule, S3Module],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
