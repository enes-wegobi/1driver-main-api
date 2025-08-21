import { ApiProperty } from '@nestjs/swagger';

export class AppStartupResponseDto {
  @ApiProperty({
    description: 'Whether app requires force update',
    example: false,
  })
  forceUpdate: boolean;

  @ApiProperty({
    description: 'Latest version for this app type',
    example: '1.2.0',
    required: false,
  })
  latestVersion?: string;
}