import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CompleteEmailUpdateDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address to update to',
  })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP sent to the new email for validation',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}
