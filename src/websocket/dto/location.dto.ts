import { IsNumber, IsOptional, IsString } from 'class-validator';

export class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
  
  @IsOptional()
  @IsNumber()
  accuracy?: number;
  
  @IsOptional()
  @IsNumber()
  heading?: number;
  
  @IsOptional()
  @IsNumber()
  speed?: number;
  
  @IsOptional()
  @IsNumber()
  altitude?: number;
  
  @IsOptional()
  @IsString()
  timestamp?: string;
}