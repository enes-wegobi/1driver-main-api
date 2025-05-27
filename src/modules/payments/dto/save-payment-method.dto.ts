import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SavePaymentMethodDto {
  @ApiProperty({
    description: 'Setup Intent ID from Stripe',
    example: 'seti_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  setupIntentId: string;

  @ApiProperty({
    description: 'Payment Method ID from Stripe',
    example: 'pm_1234567890',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;

  @ApiPropertyOptional({
    description: 'Friendly name for the payment method',
    example: 'My Work Card',
  })
  @IsString()
  @IsOptional()
  name?: string;
}
