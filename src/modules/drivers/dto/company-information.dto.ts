import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CompanyInformationDto {
  @ApiProperty({
    description: 'Company name',
    example: 'Example Company Ltd.',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  companyName: string;

  @ApiProperty({
    description: 'Tax office',
    example: 'Istanbul Tax Office',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  taxOffice: string;

  @ApiProperty({
    description: 'Tax number',
    example: '1234567890',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  taxNumber: string;

  @ApiProperty({
    description: 'Company address',
    example: 'Example Street No:1, Istanbul, Turkey',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  address: string;
}

export class CreateCompanyInformationDto extends CompanyInformationDto {}
