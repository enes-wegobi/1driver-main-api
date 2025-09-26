import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsAllowedPhoneCountry } from '../../../common/validators/allowed-phone-countries.validator';

export class CreateDriverDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the driver',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the driver',
  })
  @IsString()
  @IsNotEmpty()
  surname: string;

  @ApiProperty({
    example: '+905551234567',
    description: 'Phone number in international format',
  })
  @IsAllowedPhoneCountry()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the driver',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push notification token',
    required: false,
  })
  @IsOptional()
  @IsString()
  expoToken?: string;
}
