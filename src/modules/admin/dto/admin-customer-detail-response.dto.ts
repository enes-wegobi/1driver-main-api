import { ApiProperty } from '@nestjs/swagger';

export class AdminCustomerAddressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  formatted_address: string;

  @ApiProperty()
  street_number: string;

  @ApiProperty()
  route: string;

  @ApiProperty()
  neighborhood: string;

  @ApiProperty()
  locality: string;

  @ApiProperty()
  administrative_area_level_2: string;

  @ApiProperty()
  administrative_area_level_1: string;

  @ApiProperty()
  postal_code: string;

  @ApiProperty()
  country: string;

  @ApiProperty()
  country_code: string;

  @ApiProperty()
  timezone: string;

  @ApiProperty()
  place_id: string;

  @ApiProperty()
  coordinates: {
    lat: number;
    lng: number;
  };

  @ApiProperty()
  additional_info: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdminCustomerPaymentMethodDto {
  @ApiProperty()
  brand: string;

  @ApiProperty()
  last4: string;

  @ApiProperty()
  expiryMonth: number;

  @ApiProperty()
  expiryYear: number;

  @ApiProperty()
  isDefault: boolean;
}


export class AdminCustomerVehicleDto {
  @ApiProperty()
  transmissionType: string;

  @ApiProperty()
  licensePlate: string;
}


export class AdminCustomerDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  vehicle: AdminCustomerVehicleDto;

  @ApiProperty()
  dateOfBirth: Date;

  @ApiProperty()
  identityNumber: string;

  @ApiProperty()
  photoUrl?: string;

  @ApiProperty()
  rate?: number;

  @ApiProperty({ type: [AdminCustomerAddressDto] })
  addresses: AdminCustomerAddressDto[];

  @ApiProperty({ type: [AdminCustomerPaymentMethodDto] })
  paymentMethods: AdminCustomerPaymentMethodDto[];
}