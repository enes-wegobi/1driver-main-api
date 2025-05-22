import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Amount in smallest currency unit (e.g., cents for USD)',
    example: 2000,
  })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    required: false,
    default: 'usd',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'Payment method ID to use for this payment',
    example: 'pm_1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;

  @ApiProperty({
    description: 'Additional metadata for the payment',
    required: false,
    type: Object,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}
