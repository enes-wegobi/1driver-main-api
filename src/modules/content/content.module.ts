import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { JwtModule } from 'src/jwt/jwt.module';

@Module({
  imports: [JwtModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
