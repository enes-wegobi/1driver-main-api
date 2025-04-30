import { Injectable, Logger } from '@nestjs/common';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { FileType } from './enum/file-type.enum';
import { DriverFilesStatusDto } from './dto/file-status.dto';
import {
  BankInformationDto,
  CreateBankInformationDto,
} from './dto/bank-information.dto';
import {
  CompanyInformationDto,
  CreateCompanyInformationDto,
} from './dto/company-information.dto';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly driversClient: DriversClient) {}

  async findOne(id: string) {
    return this.driversClient.findOne(id);
  }

  async checkFileExists(
    driverId: string,
    fileType: FileType,
  ): Promise<boolean> {
    return this.driversClient.checkFileExists(driverId, fileType);
  }

  async deleteFile(driverId: string, fileType: FileType): Promise<any> {
    return this.driversClient.deleteFile(driverId, fileType);
  }

  async notifyFileUploaded(
    driverId: string,
    fileType: FileType,
    fileKey: string,
    contentType: string,
    fileName: string,
  ): Promise<any> {
    return this.driversClient.notifyFileUploaded(
      driverId,
      fileType,
      fileKey,
      contentType,
      fileName,
    );
  }

  async verifyFile(
    driverId: string,
    fileType: FileType,
    isVerified: boolean,
  ): Promise<any> {
    return this.driversClient.verifyFile(driverId, fileType, isVerified);
  }

  async verifyCriminalRecord(
    driverId: string,
    isVerified: boolean,
  ): Promise<any> {
    return this.verifyFile(driverId, FileType.CRIMINAL_RECORD, isVerified);
  }

  async verifyDrivingLicenseFront(
    driverId: string,
    isVerified: boolean,
  ): Promise<any> {
    return this.verifyFile(
      driverId,
      FileType.DRIVERS_LICENSE_FRONT,
      isVerified,
    );
  }

  async verifyDrivingLicenseBack(
    driverId: string,
    isVerified: boolean,
  ): Promise<any> {
    return this.verifyFile(driverId, FileType.DRIVERS_LICENSE_BACK, isVerified);
  }

  async getDriverFiles(driverId: string): Promise<DriverFilesStatusDto> {
    return this.driversClient.getDriverFiles(driverId);
  }

  // Bank Information Methods
  async createOrUpdateBankInformation(
    driverId: string,
    bankInfoDto: CreateBankInformationDto,
  ): Promise<BankInformationDto> {
    return this.driversClient.createOrUpdateBankInformation(
      driverId,
      bankInfoDto,
    );
  }

  async getBankInformation(driverId: string): Promise<BankInformationDto> {
    return this.driversClient.getBankInformation(driverId);
  }

  async deleteBankInformation(driverId: string): Promise<any> {
    return this.driversClient.deleteBankInformation(driverId);
  }

  // Company Information Methods
  async createOrUpdateCompanyInformation(
    driverId: string,
    companyInfoDto: CreateCompanyInformationDto,
  ): Promise<CompanyInformationDto> {
    return this.driversClient.createOrUpdateCompanyInformation(
      driverId,
      companyInfoDto,
    );
  }

  async getCompanyInformation(
    driverId: string,
  ): Promise<CompanyInformationDto> {
    return this.driversClient.getCompanyInformation(driverId);
  }

  async deleteCompanyInformation(driverId: string): Promise<any> {
    return this.driversClient.deleteCompanyInformation(driverId);
  }
}
