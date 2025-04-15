import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ConfigModule } from 'src/config/config.module';
import { S3Controller } from './s3.controller';
import { ClientsModule } from 'src/clients/clients.module';

@Module({
  imports: [ConfigModule, ClientsModule],
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}
