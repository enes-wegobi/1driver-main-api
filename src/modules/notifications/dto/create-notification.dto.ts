import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from 'src/common/user-type.enum';

export class CreateNotificationDto {
  @ApiProperty({ example: '675c85b092f23af106ba2d52' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: UserType, example: UserType.CUSTOMER })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({ example: 'Trip Started' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Your driver is on the way!' })
  @IsString()
  body: string;

  @ApiProperty({
    required: false,
    example: { tripId: 'trip123', driverId: 'driver456' },
    description: 'Additional data to include in notification'
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({
    required: false,
    example: 'trip_update',
    description: 'Notification type identifier'
  })
  @IsOptional()
  @IsString()
  type?: string;
}
