import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppState } from 'src/common/enums/app-state.enum';

export class UpdateAppStateDto {
  @ApiProperty({
    enum: AppState,
    description: 'App state to set',
    example: AppState.BACKGROUND,
  })
  @IsEnum(AppState)
  state: AppState;
}
