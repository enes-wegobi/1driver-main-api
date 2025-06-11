import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AddTripCommentDto {
  @ApiProperty({
    example: 'Great trip! The driver was very professional and the car was clean.',
    description: 'Comment about the trip (max 500 characters)',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  comment: string;
}
