import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsPhoneNumber,
  Length,
} from 'class-validator';

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
  @IsPhoneNumber()
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
    example: '123456789012345',
    description: 'National identity number (15 digits)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{15}$/, { message: 'Identity number must be 15 digits' })
  identityNumber: string;

  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push notification token',
    required: false,
  })
  @IsOptional()
  @IsString()
  expoToken?: string;


  @ApiProperty({
    example: '123456',
    description: '6-digit password',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  password: string;
}
