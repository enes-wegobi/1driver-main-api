import { ApiProperty } from '@nestjs/swagger';

export class AdminStatisticsResponseDto {
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
    description: 'Total cost of all trips in date range',
    example: 1250.50,
  })
  totalCost: number;
}