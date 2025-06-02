import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { Gender } from 'src/clients/auth/gender.enum';

export class UpdateDriverProfileDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the driver',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the driver',
    required: false,
  })
  @IsOptional()
  @IsString()
  surname?: string;

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
