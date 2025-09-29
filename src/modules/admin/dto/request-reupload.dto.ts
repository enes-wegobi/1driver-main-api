import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RequestReuploadDto {
  @ApiProperty({
    description: 'Message to driver about what needs to be reuploaded',
    example: 'Please upload a clearer photo of your driving license',
    required: false,
  })
  @IsString()
  @IsOptional()
  message?: string;
}