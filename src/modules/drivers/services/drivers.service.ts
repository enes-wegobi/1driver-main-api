import { Injectable } from '@nestjs/common';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { FileType } from '../enum/file-type.enum';
import { CreateBankInformationDto } from '../dto/bank-information.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { UpdateNotificationPermissionsDto } from 'src/clients/driver/dto/update-notification-permissions.dto';
import { UpdateDriverProfileDto } from '../dto/update-driver-profile.dto';

@Injectable()
export class DriversService {
  constructor(private readonly driversClient: DriversClient) {}

  async findOne(id: string, fields?: string | string[]) {
    return this.driversClient.findOne(id, fields);
  }

  async findMany(driverIds: string[]) {
    return this.driversClient.findMany(driverIds);
  }

  async findAll(query: { page?: number; limit?: number; search?: string, onboardingStatus?: string[]}) {
    return this.driversClient.findAll(query);
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
    fileUrl: string,
    contentType: string,
    fileName: string,
  ): Promise<any> {
    return this.driversClient.notifyFileUploaded(
      driverId,
      fileType,
      fileUrl,
      contentType,
      fileName,
    );
  }

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
    return this.driversClient.updatePhoto(driverId, photoUrl);
  }

  async deletePhoto(driverId: string): Promise<any> {
    return this.driversClient.deletePhoto(driverId);
  }

  async updateExpoToken(driverId: string, expoToken: string): Promise<any> {
    return this.driversClient.updateExpoToken(driverId, expoToken);
  }

  async deleteExpoToken(driverId: string): Promise<any> {
    return this.driversClient.deleteExpoToken(driverId);
  }

  async updateCustomerRate(customerId: string, rate: number): Promise<any> {
    return this.driversClient.updateCustomerRate(customerId, rate);
  }

  async deleteDriver(driverId: string): Promise<any> {
    return this.driversClient.deleteDriver(driverId);
  }

  async approveDriver(driverId: string): Promise<any> {
    return this.driversClient.approveDriver(driverId);
  }

  async rejectDriver(driverId: string, reason?: string): Promise<any> {
    return this.driversClient.rejectDriver(driverId, reason);
  }

  async requestDocumentReupload(driverId: string, message?: string): Promise<any> {
    return this.driversClient.requestDocumentReupload(driverId, message);
  }
}
