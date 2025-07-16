import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString, Length } from 'class-validator';

export class SigninDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'The phone number of the user',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  phone: string;
}
