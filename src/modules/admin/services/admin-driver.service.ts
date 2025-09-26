import { Injectable } from '@nestjs/common';
import { GetAdminDriversQueryDto } from '../dto/get-admin-drivers-query.dto';
import { AdminDriverListResponseDto, AdminDriverListItemDto } from '../dto/admin-driver-list-response.dto';
import { AdminDriverDetailResponseDto, AdminDriverBankInformationDto, AdminDriverDrivingLicenseDto, AdminDriverDrivingLicenseFileDto } from '../dto/admin-driver-detail-response.dto';
import { DriversService } from '../../drivers/drivers.service';

@Injectable()
export class AdminDriverService {
  constructor(
    private readonly driversService: DriversService,
  ) {}

  async getAllDrivers(query: GetAdminDriversQueryDto): Promise<AdminDriverListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.driversService.findAll({
      page,
      limit,
      search: query.search,
    });

    const mappedDrivers = result.items?.map(driver => this.mapDriverToListItem(driver)) || [];

    return {
      drivers: mappedDrivers,
      pagination: {
        page: result.page || page,
        limit: result.limit || limit,
        total: result.total || 0,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / limit)
      }
    };
  }

  async getDriverById(driverId: string): Promise<AdminDriverDetailResponseDto | null> {
    const driver = await this.driversService.findOne(driverId);

    if (!driver) {
      return null;
    }

    return this.mapDriverToDetail(driver);
  }

  private mapDriverToListItem(driver: any): AdminDriverListItemDto {
    return {
      id: driver.id || driver._id,
      name: driver.name,
      surname: driver.surname,
      email: driver.email,
      phone: driver.phone,
      onboardingStatus: driver.onboardingStatus,
      rate: driver.rate,
    };
  }

  private mapDriverToDetail(driver: any): AdminDriverDetailResponseDto {
    const bankInformations = driver.bankInformations?.map(bank => this.mapBankInformation(bank)) || [];
    const drivingLicense = driver.drivingLicense ? this.mapDrivingLicense(driver.drivingLicense) : undefined;

    return {
      id: driver.id || driver._id,
      name: driver.name,
      surname: driver.surname,
      email: driver.email,
      phone: driver.phone,
      onboardingStatus: driver.onboardingStatus,
      smsNotificationPermission: driver.smsNotificationPermission,
      emailNotificationPermission: driver.emailNotificationPermission,
      mobileNotificationPermission: driver.mobileNotificationPermission,
      expoToken: driver.expoToken,
      rate: driver.rate,
      rateCount: driver.rateCount,
      totalRating: driver.totalRating,
      bankInformations,
      drivingLicense,
    };
  }

  private mapBankInformation(bank: any): AdminDriverBankInformationDto {
    return {
      id: bank.id || bank._id,
      fullName: bank.fullName,
      bankId: bank.bankId,
      iban: bank.iban,
      isDefault: bank.isDefault,
    };
  }

  private mapDrivingLicense(license: any): AdminDriverDrivingLicenseDto {
    return {
      front: license.front ? this.mapDrivingLicenseFile(license.front) : undefined,
      back: license.back ? this.mapDrivingLicenseFile(license.back) : undefined,
      verifiedAt: license.verifiedAt,
    };
  }

  private mapDrivingLicenseFile(file: any): AdminDriverDrivingLicenseFileDto {
    return {
      isUploaded: file.isUploaded,
      fileUrl: file.fileUrl,
      contentType: file.contentType,
      fileName: file.fileName,
      status: file.status,
      verifiedAt: file.verifiedAt,
    };
  }
}