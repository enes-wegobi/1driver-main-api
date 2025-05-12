import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DeviceInfoDto } from '../../../clients/auth/dto/device-info.dto';

export class UpdateExpoTokenDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Expo push token of the user device',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  expoToken: string;

  @ApiProperty({
    description: 'Device type',
    example: 'android',
    enum: ['android', 'ios', 'web'],
  })
  @IsString()
  @IsEnum(['android', 'ios', 'web'])
  @IsNotEmpty()
  deviceType: 'android' | 'ios' | 'web';

  @ApiProperty({
    type: DeviceInfoDto,
    description: 'Device information',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}
