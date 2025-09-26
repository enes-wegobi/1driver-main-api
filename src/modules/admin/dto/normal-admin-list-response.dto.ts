import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../enums/admin-role.enum';

export class NormalAdminListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty({ enum: AdminRole })
  role: AdminRole;
}

export class PaginationInfoDto {
  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;
}

export class NormalAdminListResponseDto {
  @ApiProperty({ type: [NormalAdminListItemDto] })
  admins: NormalAdminListItemDto[];

  @ApiProperty({ type: PaginationInfoDto })
  pagination: PaginationInfoDto;
}
