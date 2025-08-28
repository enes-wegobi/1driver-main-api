import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max } from 'class-validator';

export class UpdateRateDto {
  @ApiProperty({
    example: 4.5,
    description: 'Rating (0-5, with one decimal place)',
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  rate: number;
}
