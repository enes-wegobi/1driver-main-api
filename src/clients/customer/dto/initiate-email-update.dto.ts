import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class InitiateEmailUpdateDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address to update to',
  })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
}
