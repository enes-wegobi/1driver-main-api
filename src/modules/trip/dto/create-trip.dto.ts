import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TripStatus } from '../../common/enums/trip-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { RoutePoint } from '../../common/clients/maps/maps.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerDto } from './customer.dto';
import { DriverDto } from './driver.dto';

export class RoutePointDto implements RoutePoint {
  @ApiProperty({ description: 'Latitude coordinate', example: 40.7128 })
  @IsNotEmpty()
  @IsNumber()
  lat: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -74.006 })
  @IsNotEmpty()
  @IsNumber()
  lon: number;

  @ApiProperty({
    description: 'Location name',
    example: 'Empire State Building',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateTripDto {
  @ApiProperty({
    description: 'Customer information',
    type: CustomerDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerDto)
  customer?: CustomerDto;

  @ApiPropertyOptional({
    description: 'Driver information',
    type: DriverDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DriverDto)
  driver?: DriverDto;

  @ApiProperty({
    description: 'Array of route points',
    type: [RoutePointDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutePointDto)
  route: RoutePointDto[];

  @ApiProperty({
    description: 'Trip status',
    enum: TripStatus,
    example: TripStatus.DRAFT,
  })
  @IsEnum(TripStatus)
  status: TripStatus;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.UNPAID,
  })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: 'pm_1234567890',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({ description: 'Trip rating', example: 4.5 })
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({
    description: 'Trip comment',
    example: 'Great service!',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    description: 'Estimated distance in meters',
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  estimatedDistance?: number;

  @ApiPropertyOptional({
    description: 'Estimated duration in seconds',
    example: 1200,
  })
  @IsOptional()
  @IsNumber()
  estimatedDuration?: number;

  @ApiPropertyOptional({ description: 'Estimated cost', example: 20 })
  @IsOptional()
  @IsNumber()
  estimatedCost?: number;

  @ApiPropertyOptional({
    description: 'Array of driver IDs that have been called',
    example: ['60a1b2c3d4e5f6a7b8c9d0e3', '60a1b2c3d4e5f6a7b8c9d0e4'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  calledDriverIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of driver IDs that have rejected the trip',
    example: ['60a1b2c3d4e5f6a7b8c9d0e5'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  rejectedDriverIds?: string[];

  @ApiPropertyOptional({
    description: 'Timestamp when drivers were called',
    example: '2025-05-10T19:08:45.000Z',
  })
  @IsOptional()
  callStartTime?: Date;

  @ApiPropertyOptional({
    description: 'Number of times drivers have been called for this trip',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  callRetryCount?: number;

  @ApiPropertyOptional({
    description: 'Timestamp when the trip started',
    example: '2025-05-10T19:15:00.000Z',
  })
  @IsOptional()
  tripStartTime?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when the trip ended',
    example: '2025-05-10T19:45:00.000Z',
  })
  @IsOptional()
  tripEndTime?: Date;
}
