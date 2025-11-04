import { Injectable } from '@nestjs/common';
import { GetAdminDriversQueryDto } from '../dto/get-admin-drivers-query.dto';
import {
  AdminDriverListResponseDto,
  AdminDriverListItemDto,
} from '../dto/admin-driver-list-response.dto';
import {
  AdminDriverDetailResponseDto,
  AdminDriverBankInformationDto,
  AdminDriverDrivingLicenseDto,
  AdminDriverDrivingLicenseFileDto,
} from '../dto/admin-driver-detail-response.dto';
import { DriversService } from '../../drivers/services/drivers.service';

@Injectable()
export class AdminDriverService {
  constructor(private readonly driversService: DriversService) {}

  async getAllDrivers(
    query: GetAdminDriversQueryDto,
  ): Promise<AdminDriverListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.driversService.findAll({
      page,
      limit,
      search: query.search,
    });

    const mappedDrivers =
      result.items?.map((driver) => this.mapDriverToListItem(driver)) || [];

    return {
      drivers: mappedDrivers,
      pagination: {
        page: result.page || page,
        limit: result.limit || limit,
        total: result.total || 0,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / limit),
      },
    };
  }

  async getDriverById(
    driverId: string,
  ): Promise<AdminDriverDetailResponseDto | null> {
    const driver = await this.driversService.findOne(driverId);

    if (!driver) {
      return null;
    }

    return this.mapDriverToDetail(driver);
  }

  async getAllApplications(
    query: GetAdminDriversQueryDto,
  ): Promise<AdminDriverListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.driversService.findAllApplication({
      page,
      limit,
      search: query.search,
    });

    const mappedDrivers =
      result.items?.map((driver) => this.mapDriverToListItem(driver)) || [];

    return {
      drivers: mappedDrivers,
      pagination: {
        page: result.page || page,
        limit: result.limit || limit,
        total: result.total || 0,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / limit),
      },
    };
  }

  async getApplicationById(
    driverId: string,
  ): Promise<AdminDriverDetailResponseDto | null> {
    return this.getDriverById(driverId);
  }

  async approveApplication(driverId: string): Promise<any> {
    return this.driversService.approveDriver(driverId);
  }

  async rejectApplication(driverId: string, reason?: string): Promise<any> {
    return this.driversService.rejectDriver(driverId, reason);
  }

  async requestDocumentReupload(driverId: string, message?: string): Promise<any> {
    return this.driversService.requestDocumentReupload(driverId, message);
  }

  private mapDriverToListItem(driver: any): AdminDriverListItemDto {
    return {
      id: driver.id || driver._id,
      name: driver.name,
      surname: driver.surname,
      email: driver.email,
      phone: driver.phone,
      onboardingStatus: driver.onboardingStatus,
    };
  }

  private mapDriverToDetail(driver: any): AdminDriverDetailResponseDto {
    const bankInformations =
      driver.bankInformations?.map((bank) => this.mapBankInformation(bank)) ||
      [];
    const drivingLicense = driver.drivingLicense
      ? this.mapDrivingLicense(driver.drivingLicense)
      : undefined;

    return {
      id: driver.id || driver._id,
      name: driver.name,
      surname: driver.surname,
      email: driver.email,
      phone: driver.phone,
      photoUrl: driver.photoUrl,
      rate: driver.rate,
      onboardingStatus: driver.onboardingStatus,
      bankInformations,
      drivingLicense,
    };
  }

  private mapBankInformation(bank: any): AdminDriverBankInformationDto {
    return {
      fullName: bank.fullName,
      bankId: bank.bankId,
      iban: bank.iban,
      isDefault: bank.isDefault,
    };
  }

  private mapDrivingLicense(license: any): AdminDriverDrivingLicenseDto {
    return {
      front: license.front
        ? this.mapDrivingLicenseFile(license.front)
        : undefined,
      back: license.back ? this.mapDrivingLicenseFile(license.back) : undefined,
      verifiedAt: license.verifiedAt,
    };
  }

  private mapDrivingLicenseFile(file: any): AdminDriverDrivingLicenseFileDto {
    return {
      fileUrl: file.fileUrl,
      contentType: file.contentType,
      fileName: file.fileName,
    };
  }
}
