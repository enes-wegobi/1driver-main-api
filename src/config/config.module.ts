import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { SecretsService } from './secrets.service';
import configuration from './configuration';
import { validate } from './validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
  ],
  providers: [ConfigService, SecretsService],
  exports: [ConfigService, SecretsService],
})
export class ConfigModule {}
