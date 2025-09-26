import { ApiProperty } from '@nestjs/swagger';
import { CampaignType, CampaignTargetGroup } from '../../campaigns/enums';

export class AdminCampaignResponseDto {
  @ApiProperty({
    description: 'Campaign ID',
    example: '507f1f77bcf86cd799439011'
  })
  id?: string;

  @ApiProperty({
    description: 'Campaign name',
    example: 'Summer Discount'
  })
  name: string;

  @ApiProperty({
    description: 'Campaign start date',
    example: '2024-01-01T00:00:00.000Z'
  })
  startDate: Date;

  @ApiProperty({
    description: 'Campaign end date',
    example: '2024-12-31T23:59:59.999Z'
  })
  endDate: Date;

  @ApiProperty({
    description: 'Unique campaign code',
    example: 'SUMMER2024'
  })
  code: string;

  @ApiProperty({
    description: 'Campaign type',
    enum: CampaignType,
    example: CampaignType.PERCENTAGE
  })
  type: CampaignType;

  @ApiProperty({
    description: 'Campaign image URL',
    example: 'https://example.com/campaign-image.jpg',
    required: false
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Campaign value',
    example: 20
  })
  value: number;

  @ApiProperty({
    description: 'Target group for the campaign',
    enum: CampaignTargetGroup,
    example: CampaignTargetGroup.FIRST_TIME_USERS
  })
  targetGroup: CampaignTargetGroup;

  @ApiProperty({
    description: 'Campaign description',
    example: 'Special discount for summer season',
    required: false
  })
  description?: string;

  @ApiProperty({
    description: 'Campaign status (computed based on dates)',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE']
  })
  status: string;
}

export class AdminCampaignListResponseDto {
  @ApiProperty({
    type: [AdminCampaignResponseDto],
    description: 'List of campaigns'
  })
  data: AdminCampaignResponseDto[];

  @ApiProperty({
    description: 'Pagination information',
    example: {
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false
    }
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}