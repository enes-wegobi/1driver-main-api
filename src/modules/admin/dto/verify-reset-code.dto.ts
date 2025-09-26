import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyResetCodeDto {
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
}
