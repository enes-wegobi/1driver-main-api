import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'manual',
    description: 'Type of transmission',
    enum: ['manual', 'automatic'],
  })
  @IsString()
  @IsNotEmpty()
  transmissionType: string;

  @ApiProperty({
    example: '34ABC123',
    description: 'License plate of the vehicle',
  })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;
}
