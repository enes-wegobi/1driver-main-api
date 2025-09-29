import { ApiProperty } from '@nestjs/swagger';

export class ApplicationActionResponseDto {
  @ApiProperty({
    description: 'Success status of the action',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message describing the result',
    example: 'Driver application approved successfully',
  })
  message: string;
}