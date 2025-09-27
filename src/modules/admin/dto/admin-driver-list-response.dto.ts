import { ApiProperty } from '@nestjs/swagger';

export class AdminDriverListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;
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

export class AdminDriverListResponseDto {
  @ApiProperty({ type: [AdminDriverListItemDto] })
  drivers: AdminDriverListItemDto[];

  @ApiProperty()
  pagination: PaginationDto;
}
