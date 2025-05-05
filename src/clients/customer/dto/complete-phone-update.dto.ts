import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsPhoneNumber } from 'class-validator';

export class CompletePhoneUpdateDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'New phone number in international format',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  newPhone: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP sent to the new phone for validation',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
