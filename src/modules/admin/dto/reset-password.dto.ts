import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
  Matches,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@1driver.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: '4-digit verification code',
    example: '1111',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  code: string;

  @ApiProperty({
    description: 'New password (minimum 8 characters with special character)',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Password must contain at least one special character',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirm new password',
    example: 'NewPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: 'Confirm password must be at least 8 characters long',
  })
  @Matches(/[!@#$%^&*(),.?":{}|<>]/, {
    message: 'Confirm password must contain at least one special character',
  })
  confirmPassword: string;
}
