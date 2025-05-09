import { TripStatus } from 'src/modules/trips/enum/trip-status.enum';

export class CreateTripResponseDto {
  success: boolean;
  tripId: string;
  status: TripStatus;
  nearbyDriversCount: number;
  message?: string;
}
