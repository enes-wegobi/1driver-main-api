import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../schemas/admin-user.schema';

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