import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class RequestDriverDto {
  @ApiProperty({
    description: 'The ID of the trip to request a driver for',
    example: '60d21b4967d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsString()
  tripId: string;

  @ApiProperty({ description: 'Latitude coordinate', example: 40.7128 })
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -74.006 })
  @IsNotEmpty()
  @IsNumber()
  lon: number;
}
