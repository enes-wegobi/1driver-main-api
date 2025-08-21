import { ApiProperty } from '@nestjs/swagger';

export class ConfigResponseDto {
  @ApiProperty({
    description: 'OTP expiration time in seconds',
    example: 120,
  })
  otpExpirySeconds: number;

  @ApiProperty({
    description: 'Time window in seconds during which a trip can be cancelled',
    example: 300,
  })
  tripCancellableTimeSeconds: number;
}