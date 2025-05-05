import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class InitiatePhoneUpdateDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'New phone number in international format',
  })
  @IsPhoneNumber()
  @IsNotEmpty()
  newPhone: string;
}
