import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GetStatisticsQueryDto {
  @ApiProperty({
    required: false,
    description: 'Start date for statistics (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value).toISOString() : undefined)
  startDate?: string;

  @ApiProperty({
    required: false,
    description: 'End date for statistics (ISO string)',
    example: '2024-01-02T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value).toISOString() : undefined)
  endDate?: string;
}