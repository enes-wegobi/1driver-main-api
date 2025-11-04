import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RejectApplicationDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Invalid documents provided',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}