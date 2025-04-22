import { ApiProperty } from '@nestjs/swagger';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';

export class DriverLocationDto {
  @ApiProperty({ description: 'Latitude coordinate of the driver' })
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate of the driver' })
  longitude: number;
}

export class NearbyDriverDto {
  @ApiProperty({ description: 'Driver ID' })
  driverId: string;

  @ApiProperty({ description: 'Distance from requested location in kilometers' })
  distance: number;

  @ApiProperty({ description: 'Current driver location' })
  location: DriverLocationDto;

  @ApiProperty({ 
    description: 'Driver availability status',
    enum: DriverAvailabilityStatus,
    example: DriverAvailabilityStatus.AVAILABLE
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
    type: [NearbyDriverDto]
  })
  drivers: NearbyDriverDto[];
}
