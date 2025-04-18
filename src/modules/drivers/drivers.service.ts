import { Injectable, Logger } from '@nestjs/common';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { FileType } from './enum/file-type.enum';
import { DriverFilesStatusDto } from './dto/file-status.dto';

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
  ): Promise<any> {
    return this.driversClient.notifyFileUploaded(
      driverId,
      fileType,
      fileKey,
      contentType,
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
    return this.verifyFile(driverId, FileType.DRIVERS_LICENSE_FRONT, isVerified);
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
}
