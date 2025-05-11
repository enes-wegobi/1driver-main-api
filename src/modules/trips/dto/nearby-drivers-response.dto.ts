import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';

export class LocationDto {
  @ApiProperty({ description: 'Latitude coordinate of the driver' })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate of the driver' })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

export class NearbyDriverDto {
  @ApiProperty({ description: 'Driver ID' })
  driverId: string;

  @ApiProperty({
    description: 'Distance from requested location in kilometers',
  })
  distance: number;

  @ApiProperty({ description: 'Current driver location' })
  location: LocationDto;

  @ApiProperty({
    description: 'Driver availability status',
    enum: DriverAvailabilityStatus,
    example: DriverAvailabilityStatus.AVAILABLE,
  })
  availabilityStatus: DriverAvailabilityStatus;

  @ApiProperty({ description: 'Last location update timestamp' })
  lastUpdated: string;
}

export class NearbyDriversResponseDto {
  @ApiProperty({ description: 'Total number of drivers found' })
  total: number;

  @ApiProperty({
    description: 'List of nearby drivers',
    type: [NearbyDriverDto],
  })
  drivers: NearbyDriverDto[];
}
