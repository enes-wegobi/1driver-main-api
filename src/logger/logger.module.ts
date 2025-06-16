import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimpleLoggerService } from './simple-logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SimpleLoggerService],
  exports: [SimpleLoggerService],
})
export class LoggerModule {}
