import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LocationDto } from './location.dto';

export enum DriverAvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ON_TRIP = 'on_trip',
}

export class DriverLocationDto extends LocationDto {
  @ApiProperty({
    enum: DriverAvailabilityStatus,
    description: 'Driver availability status',
    example: DriverAvailabilityStatus.AVAILABLE,
    required: false,
    default: DriverAvailabilityStatus.BUSY,
  })
  @IsEnum(DriverAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: DriverAvailabilityStatus =
    DriverAvailabilityStatus.BUSY;

  @ApiProperty({
    description: 'Whether the driver is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
