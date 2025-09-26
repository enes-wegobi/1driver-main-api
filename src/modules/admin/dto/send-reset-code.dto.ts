import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendResetCodeDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@1driver.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
