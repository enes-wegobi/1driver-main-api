import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@1driver.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'password123!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
