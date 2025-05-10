import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationCoordinateDto {
  @ApiProperty({ description: 'Latitude coordinate', example: 41.0082 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', example: 28.9784 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class EstimateTripDto {
  @ApiProperty({ description: 'Origin location coordinates' })
  @Type(() => LocationCoordinateDto)
  @IsNotEmpty()
  origin: LocationCoordinateDto;

  @ApiProperty({ description: 'Destination location coordinates' })
  @Type(() => LocationCoordinateDto)
  @IsNotEmpty()
  destination: LocationCoordinateDto;
}
