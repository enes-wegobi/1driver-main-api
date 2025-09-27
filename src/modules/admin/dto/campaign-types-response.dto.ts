import { ApiProperty } from '@nestjs/swagger';

export class CampaignTypesResponseDto {
  @ApiProperty({
    description: 'List of available campaign types',
    example: ['percentage', 'amount'],
    type: [String],
  })
  types: string[];
}