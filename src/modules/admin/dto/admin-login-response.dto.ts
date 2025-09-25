import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../schemas/admin-user.schema';

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
    firstName: string;
    lastName: string;
    role: AdminRole;
    lastLoginAt: Date;
  };
}