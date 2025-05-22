import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class VehicleDto {
  @ApiPropertyOptional({
    description: 'Vehicle transmission type',
    example: 'automatic',
  })
  @IsOptional()
  @IsString()
  transmissionType?: string;

  @ApiPropertyOptional({
    description: 'Vehicle license plate',
    example: 'ABC123',
  })
  @IsOptional()
  @IsString()
  licensePlate?: string;
}

export class CustomerDto {
  @ApiPropertyOptional({
    description: 'Customer ID',
    example: '60a1b2c3d4e5f6a7b8c9d0e2',
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer surname',
    example: 'Doe',
  })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiPropertyOptional({
    description: 'Customer rating',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional({
    description: 'Customer vehicle information',
    type: VehicleDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleDto)
  vehicle?: VehicleDto;

  @ApiPropertyOptional({
    description: 'Customer photo key',
    example: 'customer-photo-123.jpg',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
