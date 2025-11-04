import { ApiProperty } from '@nestjs/swagger';

export class MobileConfigResponseDto {
  @ApiProperty({
    description: 'Current mobile app build version',
    example: '1.2.3',
  })
  buildVersion: string;

  @ApiProperty({
    description: 'OTP expiration time in minutes',
    example: 2,
  })
  otpExpiryMinutes: number;

  @ApiProperty({
    description: 'Time window in minutes during which a trip can be cancelled',
    example: 5,
  })
  tripCancellableTimeMinutes: number;

  @ApiProperty({
    description: 'Server timestamp when the configuration was retrieved',
    example: '2024-01-01T12:00:00.000Z',
  })
  serverTimestamp: string;
}
