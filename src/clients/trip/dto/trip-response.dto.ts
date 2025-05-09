import { TripStatus } from 'src/modules/trips/enum/trip-status.enum';
import { LocationPointDto } from 'src/modules/trips/dto/create-trip.dto';

export class StatusHistoryEntryDto {
  status: TripStatus;
  timestamp: string;
  message: string;
  driverId?: string;
  cancellationReason?: string;
}

export class TripResponseDto {
  id: string;
  customerId: string;
  driverId?: string;
  status: TripStatus;
  pickup: LocationPointDto;
  dropoff: LocationPointDto;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntryDto[];
}
