import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RoutePointDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 40.7128 })
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -74.006 })
  @IsNotEmpty()
  @IsNumber()
  lon: number;

  @ApiProperty({
    description: 'Location name',
    example: 'Empire State Building',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class EstimateTripDto {
  @ApiProperty({
    description: 'Array of route points (minimum 2 points required)',
    type: [RoutePointDto],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  route: RoutePointDto[];
}
