import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RequestDriverDto {
  @ApiProperty({
    description: 'The ID of the trip to request a driver for',
    example: '60d21b4967d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsString()
  tripId: string;
}
