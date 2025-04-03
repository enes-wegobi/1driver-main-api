import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SigninDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'The phone number of the user',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}