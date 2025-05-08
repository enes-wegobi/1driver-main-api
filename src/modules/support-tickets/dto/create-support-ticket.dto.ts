import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSupportTicketDto {
  @ApiProperty({ description: 'Subject of the support ticket' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ description: 'Description of the support ticket' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
