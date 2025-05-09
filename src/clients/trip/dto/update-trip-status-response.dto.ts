import { TripStatus } from 'src/modules/trips/enum/trip-status.enum';

export class UpdateTripStatusResponseDto {
  success: boolean;
  tripId: string;
  status: TripStatus;
  message: string;
}
