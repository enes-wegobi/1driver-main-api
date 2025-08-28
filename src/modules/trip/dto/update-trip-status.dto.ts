import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { TripStatus } from 'src/common/enums/trip-status.enum';

export class UpdateTripStatusDto {
  @ApiProperty({
    enum: TripStatus,
    description: 'The new status for the trip',
    example: TripStatus.DRIVER_ON_WAY_TO_PICKUP,
  })
  @IsNotEmpty()
  @IsEnum(TripStatus)
  status: TripStatus;
}
