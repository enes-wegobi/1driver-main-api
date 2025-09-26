import { ApiProperty } from '@nestjs/swagger';

export class AdminDriverBankInformationDto {
  @ApiProperty()
  id: string;

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
  isUploaded: boolean;

  @ApiProperty()
  fileUrl?: string;

  @ApiProperty()
  contentType?: string;

  @ApiProperty()
  fileName?: string;

  @ApiProperty()
  status?: string;

  @ApiProperty()
  verifiedAt?: Date;
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
  onboardingStatus: string;

  @ApiProperty()
  smsNotificationPermission: boolean;

  @ApiProperty()
  emailNotificationPermission: boolean;

  @ApiProperty()
  mobileNotificationPermission: boolean;

  @ApiProperty()
  expoToken?: string;

  @ApiProperty()
  rate?: number;

  @ApiProperty()
  rateCount?: number;

  @ApiProperty()
  totalRating?: number;

  @ApiProperty({ type: [AdminDriverBankInformationDto] })
  bankInformations: AdminDriverBankInformationDto[];

  @ApiProperty()
  drivingLicense?: AdminDriverDrivingLicenseDto;
}