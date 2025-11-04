import { ApiProperty } from '@nestjs/swagger';

export class AdminDriverBankInformationDto {
  @ApiProperty()
  fullName: string;

  @ApiProperty()
  bankId: string;

  @ApiProperty()
  iban: string;

  @ApiProperty()
  isDefault: boolean;
}

export class AdminDriverDrivingLicenseFileDto {
  @ApiProperty()
  fileUrl?: string;

  @ApiProperty()
  contentType?: string;

  @ApiProperty()
  fileName?: string;
}

export class AdminDriverDrivingLicenseDto {
  @ApiProperty()
  front?: AdminDriverDrivingLicenseFileDto;

  @ApiProperty()
  back?: AdminDriverDrivingLicenseFileDto;

  @ApiProperty()
  verifiedAt?: Date;
}

export class AdminDriverDetailResponseDto {
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
  photoUrl: string;

  @ApiProperty()
  onboardingStatus: string;

  @ApiProperty()
  rate?: number;

  @ApiProperty({ type: [AdminDriverBankInformationDto] })
  bankInformations: AdminDriverBankInformationDto[];

  @ApiProperty()
  drivingLicense?: AdminDriverDrivingLicenseDto;
}
