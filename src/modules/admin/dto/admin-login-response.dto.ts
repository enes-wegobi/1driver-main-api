import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../enums/admin-role.enum';

export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Admin user information',
  })
  admin: {
    id: string;
    email: string;
    name: string;
    surname: string;
    role: AdminRole;
  };
}