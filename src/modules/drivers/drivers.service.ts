import { Injectable, Logger } from '@nestjs/common';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { FileType } from './enum/file-type.enum';
import { CreateBankInformationDto } from './dto/bank-information.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { UpdateNotificationPermissionsDto } from 'src/clients/driver/dto/update-notification-permissions.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly driversClient: DriversClient) {}

  async findOne(id: string, fields?: string | string[]) {
    return this.driversClient.findOne(id, fields);
  }

  async findMany(driverIds: string[]) {
    this.logger.log(`Fetching information for ${driverIds.length} drivers`);
    return this.driversClient.findMany(driverIds);
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

  // Email and Phone Update Methods
  async initiateEmailUpdate(
    driverId: string,
    dto: InitiateEmailUpdateDto,
  ): Promise<any> {
    return this.driversClient.initiateEmailUpdate(driverId, dto);
  }

  async completeEmailUpdate(
    driverId: string,
    dto: CompleteEmailUpdateDto,
  ): Promise<any> {
    return this.driversClient.completeEmailUpdate(driverId, dto);
  }

  async initiatePhoneUpdate(
    driverId: string,
    dto: InitiatePhoneUpdateDto,
  ): Promise<any> {
    return this.driversClient.initiatePhoneUpdate(driverId, dto);
  }

  async completePhoneUpdate(
    driverId: string,
    dto: CompletePhoneUpdateDto,
  ): Promise<any> {
    return this.driversClient.completePhoneUpdate(driverId, dto);
  }

  async updateNotificationPermissions(
    driverId: string,
    permissionsDto: UpdateNotificationPermissionsDto,
  ): Promise<any> {
    return this.driversClient.updateNotificationPermissions(
      driverId,
      permissionsDto,
    );
  }

  async updateProfile(
    driverId: string,
    updateProfileDto: UpdateDriverProfileDto,
  ): Promise<any> {
    return this.driversClient.updateProfile(driverId, updateProfileDto);
  }

  async updatePhoto(driverId: string, photoUrl: string): Promise<any> {
    this.logger.log(`Updating photo for driver ${driverId}`);
    return this.driversClient.updatePhoto(driverId, photoUrl);
  }

  async deletePhoto(driverId: string): Promise<any> {
    this.logger.log(`Deleting photo for driver ${driverId}`);
    return this.driversClient.deletePhoto(driverId);
  }

  async updateExpoToken(driverId: string, expoToken: string): Promise<any> {
    this.logger.log(`Updating expo token for driver ${driverId}`);
    return this.driversClient.updateExpoToken(driverId, expoToken);
  }

  async deleteExpoToken(driverId: string): Promise<any> {
    return this.driversClient.deleteExpoToken(driverId);
  }

  async updateCustomerRate(customerId: string, rate: number): Promise<any> {
    return this.driversClient.updateCustomerRate(customerId, rate);
  }
}
