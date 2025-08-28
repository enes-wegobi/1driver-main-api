import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class PayTripDto {
  @ApiProperty({
    description: 'Trip ID to process payment for',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  tripId: string;

  @ApiProperty({
    description: 'Payment Method ID to use for payment',
    example: '507f1f77bcf86cd799439012',
  })
  @IsString()
  @IsNotEmpty()
  paymentMethodId: string;
}
