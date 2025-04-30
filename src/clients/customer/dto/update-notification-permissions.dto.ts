import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateNotificationPermissionsDto {
  @ApiProperty({
    example: true,
    description: 'Permission to send SMS notifications',
    required: true,
  })
  @IsBoolean()
  smsNotificationPermission: boolean;

  @ApiProperty({
    example: true,
    description: 'Permission to send email notifications',
    required: true,
  })
  @IsBoolean()
  emailNotificationPermission: boolean;

  @ApiProperty({
    example: true,
    description: 'Permission to send mobile push notifications',
    required: true,
  })
  @IsBoolean()
  mobileNotificationPermission: boolean;
}
