import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  IsDateString,
  Length,
} from 'class-validator';
import { IsAllowedPhoneCountry } from '../../../common/validators/allowed-phone-countries.validator';
import { Type } from 'class-transformer';
import { CreateVehicleDto } from './create-vehicle.dto';
import { Gender } from '../gender.enum';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the customer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the customer',
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
    description: 'Email address of the customer',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    type: CreateVehicleDto,
    description: 'Vehicle information',
  })
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle: CreateVehicleDto;

  @ApiProperty({
    example: '1993-06-17',
    description: 'Date of birth in ISO format',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: Gender.MALE,
    description: 'Gender',
    enum: Gender,
    enumName: 'Gender',
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push notification token',
    required: false,
  })
  @IsOptional()
  @IsString()
  expoToken?: string;
}
