import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../enums/admin-role.enum';

export class AdminCreateResponseDto {
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