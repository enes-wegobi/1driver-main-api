import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
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
  @IsString()
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
    example: '12345678901',
    description: 'National identity number (11 digits)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Identity number must be 11 digits' })
  identityNumber?: string;

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
}
