import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AppStartupRequestDto {
  @ApiProperty({
    description: 'Current app version',
    example: '1.2.3',
  })
  @IsString()
  version: string;
}