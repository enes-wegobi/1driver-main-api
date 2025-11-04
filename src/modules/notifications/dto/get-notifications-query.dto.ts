import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetNotificationsQueryDto {
  @ApiProperty({
    required: false,
    default: 1,
    minimum: 1,
    example: 1,
    description: 'Page number'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 20,
    minimum: 1,
    example: 20,
    description: 'Items per page'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
