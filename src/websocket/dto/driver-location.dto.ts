import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { LocationDto } from './location.dto';

export enum DriverAvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

export class DriverLocationDto extends LocationDto {
  @IsEnum(DriverAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: DriverAvailabilityStatus =
    DriverAvailabilityStatus.AVAILABLE;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
