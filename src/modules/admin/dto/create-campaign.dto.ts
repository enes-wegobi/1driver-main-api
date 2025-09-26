import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDate, IsEnum, IsNumber, IsOptional, IsUrl, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { CampaignType, CampaignTargetGroup } from '../../campaigns/enums';

export class CreateCampaignDto {
  @ApiProperty({
    description: 'Campaign name',
    example: 'Summer Discount'
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Campaign start date',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsNotEmpty()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate: Date;

  @ApiProperty({
    description: 'Campaign end date',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsNotEmpty()
  @IsDate()
  @Transform(({ value }) => new Date(value))
  endDate: Date;

  @ApiProperty({
    description: 'Unique campaign code',
    example: 'SUMMER2024'
  })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Campaign type',
    enum: CampaignType,
    example: CampaignType.PERCENTAGE
  })
  @IsNotEmpty()
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Campaign image file'
  })
  @IsOptional()
  image?: any;

  @ApiProperty({
    description: 'Campaign value (percentage: 1-100, amount: positive number)',
    example: 20
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Transform(({ value, obj }) => {
    if (obj.type === CampaignType.PERCENTAGE) {
      return Math.min(Math.max(value, 1), 100);
    }
    return Math.max(value, 0.01);
  })
  value: number;

  @ApiProperty({
    description: 'Target group for the campaign',
    enum: CampaignTargetGroup,
    example: CampaignTargetGroup.FIRST_TIME_USERS
  })
  @IsNotEmpty()
  @IsEnum(CampaignTargetGroup)
  targetGroup: CampaignTargetGroup;

  @ApiProperty({
    description: 'Campaign description',
    example: 'Special discount for summer season',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;
}
