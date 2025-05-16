import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SetActiveTripDto {
  @ApiProperty({
    description: 'The ID of the trip to set as active',
    example: '60d21b4667d0d8992e610c85',
  })
  @IsNotEmpty()
  @IsString()
  tripId: string;
}
