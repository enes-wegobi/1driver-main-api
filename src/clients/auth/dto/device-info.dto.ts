import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeviceInfoDto {
  @ApiProperty({
    example: 'iPhone 12',
    description: 'Device model',
  })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({
    example: 'iOS',
    description: 'Operating system',
  })
  @IsString()
  @IsNotEmpty()
  os: string;

  @ApiProperty({
    example: '15.0',
    description: 'OS version',
  })
  @IsString()
  @IsNotEmpty()
  osVersion: string;

  @ApiProperty({
    example: '1.0.0',
    description: 'App version',
  })
  @IsString()
  @IsNotEmpty()
  appVersion: string;

  @ApiProperty({
    example: 'ABCD1234-5678-EFGH-9012',
    description: 'Unique device identifier',
  })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
