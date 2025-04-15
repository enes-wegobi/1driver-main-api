import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [ClientsModule, JwtModule],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}
