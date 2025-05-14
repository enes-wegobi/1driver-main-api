import { Module } from '@nestjs/common';
import { MapsService } from './maps.service';
import { ConfigModule } from 'src/config/config.module';

@Module({
  imports: [ConfigModule],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
