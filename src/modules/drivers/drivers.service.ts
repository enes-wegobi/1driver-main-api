import { Injectable, Logger } from '@nestjs/common';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { FileType } from './enum/file-type.enum';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly driversClient: DriversClient) {}

  async findOne(id: string) {
    return this.driversClient.findOne(id);
  }

  async checkFileExists(driverId: string, fileType: FileType): Promise<boolean> {
    this.logger.log(`Checking if file of type ${fileType} exists for driver ${driverId}`);
    return this.driversClient.checkFileExists(driverId, fileType);
  }

  async deleteFile(driverId: string, fileType: FileType): Promise<any> {
    this.logger.log(`Deleting file of type ${fileType} for driver ${driverId}`);
    return this.driversClient.deleteFile(driverId, fileType);
  }

  async notifyFileUploaded(driverId: string, fileType: FileType, fileKey: string): Promise<any> {
    this.logger.log(`Notifying file upload of type ${fileType} for driver ${driverId}`);
    return this.driversClient.notifyFileUploaded(driverId, fileType, fileKey);
  }
}
