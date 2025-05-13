import { RoutePointDto } from 'src/modules/trips/dto/estimate-trip.dto';

export class CallDriverEventDto {
  tripId: string;
  customerId: string;
  pickup: RoutePointDto;
  dropoff: RoutePointDto;
  estimatedDistanceKm: number;
  estimatedDurationMinutes: number;
  estimatedFare: number;
}
