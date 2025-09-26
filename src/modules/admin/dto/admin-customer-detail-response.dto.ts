import { ApiProperty } from '@nestjs/swagger';

export class AdminCustomerAddressDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  addressLine: string;

  @ApiProperty()
  city: string;

  @ApiProperty()
  district: string;

  @ApiProperty()
  coordinates: {
    lat: number;
    lng: number;
  };

  @ApiProperty()
  isDefault: boolean;
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