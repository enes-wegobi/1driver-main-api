import { ApiProperty } from '@nestjs/swagger';

export class CampaignTargetGroupsResponseDto {
  @ApiProperty({
    description: 'List of available campaign target groups',
    example: ['first_time_users', 'frequent_users', 'vip_customers'],
    type: [String],
  })
  targetGroups: string[];
}