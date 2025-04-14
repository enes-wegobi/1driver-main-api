import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class GeoLocation {
  @ApiProperty({
    example: 'Point',
    description: 'GeoJSON type',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: [-122.408, 37.788],
    description: 'Coordinates [longitude, latitude]',
  })
  @IsNotEmpty()
  coordinates: [number, number];
}

export class CreateAddressDto {
  @ApiProperty({
    example: 'Home',
    description: 'Address label (e.g., Home, Work)',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: '2-16 Ellis St, San Francisco, CA 94108, USA',
    description: 'Fully formatted address text',
  })
  @IsString()
  @IsNotEmpty()
  formatted_address: string;

  // Google Maps API fields
  @ApiProperty({
    example: '2–16',
    description: 'Building number',
    required: false,
  })
  @IsString()
  @IsOptional()
  street_number?: string;

  @ApiProperty({
    example: 'Ellis St',
    description: 'Street name',
    required: false,
  })
  @IsString()
  @IsOptional()
  route?: string;

  @ApiProperty({
    example: 'Union Square',
    description: 'Neighborhood',
    required: false,
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({
    example: 'San Francisco',
    description: 'City',
    required: false,
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({
    example: 'San Francisco County',
    description: 'County',
    required: false,
  })
  @IsString()
  @IsOptional()
  administrative_area_level_2?: string;

  @ApiProperty({
    example: 'CA',
    description: 'State/Province',
    required: false,
  })
  @IsString()
  @IsOptional()
  administrative_area_level_1?: string;

  @ApiProperty({
    example: '94108',
    description: 'Postal code',
    required: false,
  })
  @IsString()
  @IsOptional()
  postal_code?: string;

  @ApiProperty({
    example: 'United States',
    description: 'Country name',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    example: 'US',
    description: 'ISO Country Code',
    required: false,
  })
  @IsString()
  @IsOptional()
  country_code?: string;

  @ApiProperty({
    example: 'America/Los_Angeles',
    description: 'Timezone',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    example: 'ChIJIQBpAG2ahYAR_6128GcTUEo',
    description: 'Google Maps unique place ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  place_id?: string;

  @ApiProperty({
    example: {
      type: 'Point',
      coordinates: [-122.408, 37.788],
    },
    description: 'GeoJSON location object',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GeoLocation)
  location: GeoLocation;

  @ApiProperty({
    example: 'Ring the doorbell',
    description: 'Additional delivery instructions',
    required: false,
  })
  @IsString()
  @IsOptional()
  additional_info?: string;

  @ApiProperty({
    example: false,
    description: 'Is this the default address?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
