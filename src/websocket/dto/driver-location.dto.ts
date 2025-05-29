import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { LocationDto } from './location.dto';

export enum DriverAvailabilityStatus {
  IDLE = 'idle',
  AVAILABLE = 'available',
  BUSY = 'busy',
}

export class DriverLocationDto extends LocationDto {
  @IsEnum(DriverAvailabilityStatus)
  @IsOptional()
  availabilityStatus?: DriverAvailabilityStatus =
    DriverAvailabilityStatus.IDLE;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
