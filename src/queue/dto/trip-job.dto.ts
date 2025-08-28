import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class TripDataDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsNumber()
  estimatedDistance?: number;

  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  route?: LocationDto[];
}

export class CreateTripRequestJobDto {
  @IsString()
  tripId: string;

  @IsString()
  driverId: string;

  @IsNumber()
  priority: number;

  @ValidateNested()
  @Type(() => LocationDto)
  customerLocation: LocationDto;

  @ValidateNested()
  @Type(() => TripDataDto)
  tripData: TripDataDto;

  @IsOptional()
  @IsNumber()
  retryCount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originalDriverIds?: string[];
}

export class CreateTripTimeoutJobDto {
  @IsString()
  tripId: string;

  @IsString()
  driverId: string;

  @IsString()
  timeoutType: 'driver_response' | 'pickup_arrival' | 'trip_completion';

  @IsDateString()
  scheduledAt: Date;

  @IsOptional()
  metadata?: {
    customerLocation?: LocationDto;
    originalDriverIds?: string[];
    retryCount?: number;
  };
}

export class QueueStatsDto {
  @IsString()
  queueName: string;

  @IsNumber()
  waiting: number;

  @IsNumber()
  active: number;

  @IsNumber()
  completed: number;

  @IsNumber()
  failed: number;

  @IsNumber()
  delayed: number;
}
