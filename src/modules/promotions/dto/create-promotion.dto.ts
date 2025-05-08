import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PromotionType } from '../enum/promotion-type.enum';
import { UserSegment } from '../enum/user-segment.enum';
import { PromotionStatus } from '../enum/promotion-status.enum';

export class CreatePromotionDto {
  @ApiProperty({ description: 'Name of the promotion' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description of the promotion' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Unique code for the promotion' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ description: 'Type of promotion (percentage or direct)', enum: PromotionType })
  @IsNotEmpty()
  @IsEnum(PromotionType)
  promotionType: PromotionType;

  @ApiProperty({ description: 'Value of the promotion (percentage or direct amount)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'User segment for the promotion', enum: UserSegment })
  @IsNotEmpty()
  @IsEnum(UserSegment)
  userSegment: UserSegment;

  @ApiProperty({ description: 'Start date of the promotion' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({ description: 'End date of the promotion' })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @ApiProperty({ description: 'Photo key for the promotion image', required: false })
  @IsOptional()
  @IsString()
  photoKey?: string;

  @ApiProperty({ description: 'Status of the promotion', enum: PromotionStatus, default: PromotionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @ApiProperty({ description: 'Maximum number of times this promotion can be used', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @ApiProperty({ description: 'Maximum number of times a user can use this promotion', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  userUsageLimit?: number;
}
