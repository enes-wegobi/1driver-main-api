import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppState } from 'src/common/enums/app-state.enum';

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
  })
  @IsEnum(AppState)
  appState: AppState;
}
