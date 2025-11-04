import { ApiProperty } from '@nestjs/swagger';

export class CampaignTargetGroupsResponseDto {
  @ApiProperty({
    description: 'List of available campaign target groups',
    example: ['first_time_users'],
    type: [String],
  })
  targetGroups: string[];
}