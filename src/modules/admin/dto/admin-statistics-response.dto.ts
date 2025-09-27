import { ApiProperty } from '@nestjs/swagger';
import { TripCostSummary } from '../../trip/schemas/trip-cost-summary.schema';

export class AdminStatisticsResponseDto {
  @ApiProperty({
    description: 'Total number of trips in date range',
    example: 150,
  })
  totalTrips: number;

  @ApiProperty({
    description: 'Number of completed trips in date range',
    example: 80,
  })
  completedTrips: number;

  @ApiProperty({
    description: 'Total number of drivers (all time)',
    example: 45,
  })
  totalDrivers: number;

  @ApiProperty({
    description: 'Total number of customers (all time)',
    example: 200,
  })
  totalCustomers: number;

  @ApiProperty({
    description: 'Cost summaries for trips in date range',
    type: [TripCostSummary],
  })
  costSummaries: TripCostSummary[];
}