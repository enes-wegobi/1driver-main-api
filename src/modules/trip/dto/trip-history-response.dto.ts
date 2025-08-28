import { ApiProperty } from '@nestjs/swagger';
import { TripDocument } from '../schemas/trip.schema';

export class PaginationDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

export class TripHistoryDataDto {
  @ApiProperty({ description: 'List of trips', type: [Object] })
  trips: TripDocument[];

  @ApiProperty({ description: 'Pagination information', type: PaginationDto })
  pagination: PaginationDto;
}

export class TripHistoryResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message', required: false })
  message?: string;

  @ApiProperty({ description: 'Trip history data', type: TripHistoryDataDto })
  data: TripHistoryDataDto;
}
