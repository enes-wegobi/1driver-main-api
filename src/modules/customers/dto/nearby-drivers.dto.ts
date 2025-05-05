import { IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NearbyDriversQueryDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 41.0082 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 28.9784 })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiProperty({ 
    description: 'Search radius in kilometers', 
    example: 5,
    required: false,
    default: 5,
    minimum: 0.1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  @Type(() => Number)
  radius?: number = 5;
}

export class SubscribeToNearbyDriversDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 41.0082 })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 28.9784 })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @ApiProperty({ 
    description: 'Search radius in kilometers', 
    example: 5,
    required: false,
    default: 5,
    minimum: 0.1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(50)
  radius?: number = 5;
}
