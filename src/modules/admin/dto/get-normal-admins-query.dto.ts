import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GetNormalAdminsQueryDto {
  @ApiProperty({
    required: false,
    default: 1,
    description: 'Page number'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    required: false,
    default: 10,
    description: 'Number of items per page'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({
    required: false,
    description: 'Search term for email, name or surname'
  })
  @IsOptional()
  @IsString()
  search?: string;
}