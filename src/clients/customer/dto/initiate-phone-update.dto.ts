import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';

export class InitiatePhoneUpdateDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'New phone number in international format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{10,14}$/, {
    message:
      'Phone number must be in international format (e.g., +905551234567)',
  })
  newPhone: string;
}
