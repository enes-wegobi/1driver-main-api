import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, Min, Max, IsString, IsArray, ArrayMinSize, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class RoutePointDto {
    @ApiProperty({ description: 'Latitude coordinate', example: 40.7128 })
    @IsNotEmpty()
    @IsNumber()
    lat: number;
  
    @ApiProperty({ description: 'Longitude coordinate', example: -74.0060 })
    @IsNotEmpty()
    @IsNumber()
    lon: number;
  
    @ApiPropertyOptional({ description: 'Location name', example: 'Empire State Building' })
    @IsString()
    @IsOptional()
    name?: string;
  
    @ApiProperty({ description: 'Order of the point in the route', example: 1 })
    @IsNotEmpty()
    @IsNumber()
    order: number;
  }
  
  export class EstimateTripDto {  
    @ApiProperty({ 
      description: 'Array of route points (minimum 2 points required)',
      type: [RoutePointDto]
    })
    @IsArray()
    @ArrayMinSize(2)
    @ValidateNested({ each: true })
    @Type(() => RoutePointDto)
    routePoints: RoutePointDto[];
  }
