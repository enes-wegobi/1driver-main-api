import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateOtpDto {
  @ApiProperty({
    description: 'Phone number of the user',
    example: '+905551234567',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'OTP sent to the user for validation',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
