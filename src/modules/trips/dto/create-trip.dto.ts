import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationPointDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 41.0082 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 28.9784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    description: 'Address description',
    example: 'Istanbul Airport',
  })
  @IsString()
  @IsNotEmpty()
  address: string;
}

export class CreateTripDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Pickup location' })
  @Type(() => LocationPointDto)
  @IsNotEmpty()
  pickup: LocationPointDto;

  @ApiProperty({ description: 'Dropoff location' })
  @Type(() => LocationPointDto)
  @IsNotEmpty()
  dropoff: LocationPointDto;

  @ApiProperty({
    description: 'Estimated distance in kilometers',
    example: 15.5,
  })
  @IsNumber()
  @Min(0)
  estimatedDistanceKm: number;

  @ApiProperty({ description: 'Estimated duration in minutes', example: 30 })
  @IsNumber()
  @Min(0)
  estimatedDurationMinutes: number;

  @ApiProperty({ description: 'Estimated fare amount', example: 50.75 })
  @IsNumber()
  @Min(0)
  estimatedFare: number;

  @ApiProperty({
    description: 'Payment method',
    example: 'CASH',
    enum: ['CASH', 'CREDIT_CARD', 'WALLET'],
  })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiProperty({
    description: 'Additional notes for the driver',
    example: 'Please call when you arrive',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
