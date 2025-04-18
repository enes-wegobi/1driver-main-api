import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class BankInformationDto {
  @ApiProperty({
    description: 'Full name on the bank account',
    example: 'John Doe',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    description: 'Bank name',
    example: 'Example Bank',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  bankName: string;

  @ApiProperty({
    description: 'IBAN number',
    example: 'TR123456789012345678901234',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(34)
  iban: string;
}

export class CreateBankInformationDto extends BankInformationDto {}
