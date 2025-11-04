import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

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
    example: '1993-06-17',
    description: 'Date of birth in ISO format',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
