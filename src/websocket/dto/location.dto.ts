import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({
    description: 'Latitude coordinate',
    example: 41.0082,
    type: 'number',
  })
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description: 'Longitude coordinate',
    example: 28.9784,
    type: 'number',
  })
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'GPS accuracy in meters',
    example: 5.0,
    required: false,
    type: 'number',
  })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiProperty({
    description: 'Heading direction in degrees (0-360)',
    example: 45.5,
    required: false,
    type: 'number',
  })
  @IsOptional()
  @IsNumber()
  heading?: number;

  @ApiProperty({
    description: 'Speed in meters per second',
    example: 15.5,
    required: false,
    type: 'number',
  })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({
    description: 'Altitude in meters',
    example: 100.0,
    required: false,
    type: 'number',
  })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiProperty({
    description: 'Timestamp of the location update',
    example: '2024-01-01T12:00:00.000Z',
    required: false,
    type: 'string',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}
