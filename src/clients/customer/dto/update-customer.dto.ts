import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  IsDateString,
  IsEnum,
  IsEmail,
  IsPhoneNumber,
} from 'class-validator';

export class UpdateCustomerDto {
  @ApiHideProperty()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiHideProperty()
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '123456789011111',
    description: 'National identity number (15 digits)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, { message: 'Identity number must be 15 digits' })
  identityNumber?: string;

  @ApiProperty({
    example: '1993-06-17',
    description: 'Date of birth in ISO format',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
