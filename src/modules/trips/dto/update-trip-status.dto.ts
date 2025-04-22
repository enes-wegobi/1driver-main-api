import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { TripStatus } from '../enum/trip-status.enum';

export class UpdateTripStatusDto {
  @ApiProperty({
    description: 'Trip ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({
    description: 'New trip status',
    enum: TripStatus,
    example: TripStatus.ACCEPTED,
  })
  @IsEnum(TripStatus)
  @IsNotEmpty()
  status: TripStatus;

  @ApiProperty({
    description: 'Optional message or reason for status change',
    example: 'Driver is 5 minutes away',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty({
    description: 'Driver ID (required for ACCEPTED status)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  driverId?: string;

  @ApiProperty({
    description: 'Cancellation reason (required for CANCELLED status)',
    example: 'Customer requested cancellation',
    required: false,
  })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
