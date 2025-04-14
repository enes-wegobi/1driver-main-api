import { Module } from '@nestjs/common';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [JwtModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
