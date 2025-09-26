import { ApiProperty } from '@nestjs/swagger';
import { RoutePointDto } from './admin-trip-detail-response.dto';

export class AdminTripListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  customerName: string;

  @ApiProperty()
  driverName: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  finalCost: number;

  @ApiProperty({ type: [RoutePointDto] })
  route: RoutePointDto[];
}

export class PaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class AdminTripListResponseDto {
  @ApiProperty({ type: [AdminTripListItemDto] })
  trips: AdminTripListItemDto[];

  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}
