import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: '675c85b092f23af106ba2d52' })
  id: string;

  @ApiProperty({ example: 'Trip Started' })
  title: string;

  @ApiProperty({ example: 'Your driver is on the way!' })
  body: string;

  @ApiProperty({ example: { tripId: 'trip123' } })
  data: Record<string, any>;

  @ApiProperty({ example: 'trip_update' })
  type: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ required: false, example: '2024-01-15T10:30:00.000Z' })
  readAt?: Date;
}
