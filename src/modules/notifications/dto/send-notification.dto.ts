import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'FCM token of the user device',
    example: 'dKLIHFD8s7d:APA91bHc...',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Trip Request',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'You have a new trip request from Istanbul Airport',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Additional data to send with notification',
    example: { tripId: '123', type: 'trip_request' },
    required: false,
  })
  @IsOptional()
  data?: Record<string, string>;
}
