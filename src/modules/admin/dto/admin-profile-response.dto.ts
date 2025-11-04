import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../enums/admin-role.enum';

export class AdminProfileResponseDto {
  @ApiProperty({
    description: 'Admin user ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@1driver.com',
  })
  email: string;

  @ApiProperty({
    description: 'Admin first name',
    example: 'John',
  })
  name: string;

  @ApiProperty({
    description: 'Admin last name',
    example: 'Doe',
  })
  surname: string;

  @ApiProperty({
    description: 'Admin role',
    enum: AdminRole,
    example: AdminRole.SUPER_ADMIN,
  })
  role: AdminRole;

  @ApiProperty({
    description: 'Admin phone number',
    example: '+905551234567',
    required: false,
  })
  phone?: string;
}
