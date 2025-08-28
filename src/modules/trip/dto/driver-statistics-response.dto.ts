import { ApiProperty } from '@nestjs/swagger';

export class DriverStatisticsDataDto {
  @ApiProperty({ description: 'Number of completed trips' })
  completedTrips: number;

  @ApiProperty({ description: 'Total earnings from completed trips' })
  totalEarnings: number;

  @ApiProperty({ description: 'Total duration in seconds' })
  totalDuration: number;
}

export class DriverStatisticsResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({
    description: 'Driver statistics data',
    type: DriverStatisticsDataDto,
  })
  data: DriverStatisticsDataDto;
}
