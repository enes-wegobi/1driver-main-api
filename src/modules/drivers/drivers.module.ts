import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ClientsModule } from '../../clients/clients.module';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriverEarningsController } from './controllers/driver-earnings.controller';
import { DriverEarningsService } from './services/driver-earnings.service';
import { DriverWeeklyEarningsRepository } from './repositories/driver-weekly-earnings.repository';
import { DriverWeeklyEarnings, DriverWeeklyEarningsSchema } from './schemas/driver-weekly-earnings.schema';
import { S3Module } from 'src/s3/s3.module';
import { RedisModule } from 'src/redis/redis.module';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [
    ClientsModule, 
    JwtModule, 
    S3Module, 
    RedisModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: DriverWeeklyEarnings.name, schema: DriverWeeklyEarningsSchema }
    ]),
  ],
  controllers: [DriversController, DriverEarningsController],
  providers: [DriversService, DriverEarningsService, DriverWeeklyEarningsRepository],
  exports: [DriversService, DriverEarningsService],
})
export class DriversModule {}
