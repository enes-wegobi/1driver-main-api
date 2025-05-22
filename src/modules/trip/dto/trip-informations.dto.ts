import { IsDefined, IsNumber } from 'class-validator';

export class TripInformationsDto {
  @IsNumber()
  @IsDefined()
  estimatedTime: number;

  @IsNumber()
  @IsDefined()
  estimatedCost: number;
}
