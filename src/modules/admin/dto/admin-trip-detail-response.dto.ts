import { ApiProperty } from '@nestjs/swagger';

export class RoutePointDto {
  @ApiProperty()
  lat: number;

  @ApiProperty()
  lon: number;

  @ApiProperty()
  name: string;
}

export class AdminTripDriverDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty()
  rate: number;
}

export class AdminTripDetailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ type: [RoutePointDto] })
  route: RoutePointDto[];

  @ApiProperty({ type: AdminTripDriverDto })
  driver: AdminTripDriverDto;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  paymentMethodBrand?: string;

  @ApiProperty()
  paymentMethodLast4?: string;

  @ApiProperty()
  finalCost: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  paymentStatus: string;
}
