import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { IsAllowedPhoneCountry } from '../../../common/validators/allowed-phone-countries.validator';

export class SigninDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'The phone number of the user',
  })
  @IsAllowedPhoneCountry()
  @IsNotEmpty()
  phone: string;
}
