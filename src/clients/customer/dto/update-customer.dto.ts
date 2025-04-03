import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  IsDateString,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { Gender } from '../../auth/gender.enum';

export class UpdateCustomerDto {
  @ApiHideProperty()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsEmail()
  email?: string;

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
