import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({
    description: 'User ID',
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
    description: 'Device type',
    example: 'android',
    enum: ['android', 'ios', 'web'],
  })
  @IsString()
  @IsNotEmpty()
  deviceType: 'android' | 'ios' | 'web';
}
