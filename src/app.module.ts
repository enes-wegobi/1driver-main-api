import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/validation';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
