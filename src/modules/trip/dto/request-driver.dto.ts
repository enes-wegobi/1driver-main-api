import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class RequestDriverDto {
  @ApiProperty({
    description: 'The ID of the trip to request a driver for',
    example: '60d21b4967d0d8992e610c85',
  })
  @IsOptional()
  @IsString()
  tripId?: string;
}
