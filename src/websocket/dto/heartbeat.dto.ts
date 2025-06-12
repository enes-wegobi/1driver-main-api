import { IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AppState } from 'src/common/enums/app-state.enum';
import { LocationDto } from './location.dto';

export class HeartbeatDto {
  @ApiProperty({
    description: 'Timestamp of the heartbeat',
    example: '2024-01-01T12:00:00.000Z',
    type: 'string',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    enum: AppState,
    description: 'Current application state',
    required: false,
  })
  @IsEnum(AppState)
  @IsOptional()
  appState?: AppState;

  @ApiProperty({
    description: 'Current location data',
    type: LocationDto,
    required: false,
  })
  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}
