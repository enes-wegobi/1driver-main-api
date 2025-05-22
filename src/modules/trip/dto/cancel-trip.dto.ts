import { IsNotEmpty, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelTripDto {
  @ApiProperty({
    description: 'User ID (customer or driver)',
    example: '60a1b2c3d4e5f6a7b8c9d0e2',
  })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Type of user cancelling the trip',
    example: 'customer',
    enum: ['customer', 'driver'],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['customer', 'driver'])
  userType: string;
}
