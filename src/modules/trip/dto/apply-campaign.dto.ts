import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCampaignDto {
  @ApiProperty({
    description: 'Campaign coupon code',
    example: 'WELCOME2025',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
