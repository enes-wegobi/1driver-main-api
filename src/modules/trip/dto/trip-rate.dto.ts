import { IsNumber, IsOptional, IsString } from 'class-validator';

export class TripRateDto {
  @IsNumber()
  @IsOptional()
  rating: number;

  @IsString()
  @IsOptional()
  comment: string;
}
