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

  // Bank Information Methods
  async addBankInformation(
    driverId: string,
    bankInfoDto: CreateBankInformationDto,
  ): Promise<any> {
    return this.driversClient.addBankInformation(driverId, bankInfoDto);
  }

  async getAllBankInformation(driverId: string): Promise<any> {
    return this.driversClient.getAllBankInformation(driverId);
  }

  async deleteBankInformation(
    driverId: string,
    bankInfoId: string,
  ): Promise<any> {
    return this.driversClient.deleteBankInformation(driverId, bankInfoId);
  }

  async setDefaultBankInformation(
    driverId: string,
    bankInfoId: string,
  ): Promise<any> {
    return this.driversClient.setDefaultBankInformation(driverId, bankInfoId);
  }
}
