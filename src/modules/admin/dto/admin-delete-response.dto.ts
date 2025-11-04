import { ApiProperty } from '@nestjs/swagger';

export class AdminDeleteResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  deletedId: string;
}
