import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class DriverDto {
  @ApiProperty({
    description: 'Driver ID',
    example: '60a1b2c3d4e5f6a7b8c9d0e3',
  })
  @IsString()
  id: string;

  @ApiPropertyOptional({
    description: 'Driver name',
    example: 'Jane',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Driver surname',
    example: 'Smith',
  })
  @IsOptional()
  @IsString()
  surname?: string;

  @ApiPropertyOptional({
    description: 'Driver photo key',
    example: 'driver-photo-456.jpg',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'Driver rating',
    example: 4.8,
  })
  @IsOptional()
  @IsNumber()
  rate?: number;
}
