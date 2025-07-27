import { ApiProperty } from '@nestjs/swagger';
import { UserType } from 'src/common/user-type.enum';

export class TokenValidationResponseDto {
  @ApiProperty({
    description: 'Whether the token is valid',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'User ID from the token',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  userId?: string;

  @ApiProperty({
    description: 'User type (customer or driver)',
    enum: UserType,
    example: UserType.CUSTOMER,
    required: false,
  })
  userType?: UserType;

  @ApiProperty({
    description: 'Session information',
    required: false,
  })
  sessionInfo?: {
    deviceId: string;
    ipAddress?: string;
    lastSeenAt: string;
    createdAt: string;
  };

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: 1672531200,
    required: false,
  })
  expiresAt?: number;

  @ApiProperty({
    description: 'Error message if token is invalid',
    example: 'Token has expired',
    required: false,
  })
  error?: string;
}
