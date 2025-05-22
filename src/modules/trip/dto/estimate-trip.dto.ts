import {
  IsNotEmpty,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RoutePoint } from '../../common/clients/maps/maps.interface';
import { ApiProperty } from '@nestjs/swagger';

export class RoutePointDto implements RoutePoint {
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
    description: 'Customer ID',
    example: '60a1b2c3d4e5f6a7b8c9d0e2',
  })
  @IsNotEmpty()
  @IsString()
  customerId: string;

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
