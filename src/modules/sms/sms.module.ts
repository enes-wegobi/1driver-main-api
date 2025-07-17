import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SMSService } from './sms.service';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [ConfigModule, LoggerModule],
  providers: [SMSService],
  exports: [SMSService],
})
export class SMSModule {}