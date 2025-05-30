import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { LocationDto } from './location.dto';

export enum DriverAvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ON_TRIP = 'on_trip',
}

export class DriverLocationDto extends LocationDto {
  @IsEnum(DriverAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: DriverAvailabilityStatus =
    DriverAvailabilityStatus.BUSY;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
