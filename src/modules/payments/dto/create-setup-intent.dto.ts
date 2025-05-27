import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

export class CreateSetupIntentDto {
  @ApiPropertyOptional({
    description: 'Additional metadata for the setup intent',
    example: { source: 'mobile_app' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}
