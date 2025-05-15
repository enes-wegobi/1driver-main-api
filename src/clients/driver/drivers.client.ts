import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { FileType } from 'src/modules/drivers/enum/file-type.enum';
import { NotifyFileUploadedDto } from '../users/dto/notify-file-uploaded.dto';
import { CreateBankInformationDto } from 'src/modules/drivers/dto/bank-information.dto';
import { UpdateNotificationPermissionsDto } from './dto/update-notification-permissions.dto';
import { UpdateDriverProfileDto } from 'src/modules/drivers/dto/update-driver-profile.dto';
import {
  CompleteEmailUpdateDto,
  CompletePhoneUpdateDto,
  InitiateEmailUpdateDto,
  InitiatePhoneUpdateDto,
} from '../customer/dto';

@Injectable()
export class DriversClient {
  private readonly logger = new Logger(DriversClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findOne(id: string): Promise<any> {
    const { data } = await this.httpClient.get(`/drivers/${id}`);
    return data;
  }

  async findMany(driverIds: string[]): Promise<any[]> {
    if (!driverIds || driverIds.length === 0) {
      return [];
    }

    const { data } = await this.httpClient.post('/drivers', {
      driverIds,
    });
    return data;
  }

  async checkFileExists(
    driverId: string,
    fileType: FileType,
  ): Promise<boolean> {
    const { data } = await this.httpClient.get(
      `/drivers/${driverId}/files/${fileType}/exists`,
    );
    return data.exists;
  }

  async deleteFile(driverId: string, fileType: FileType): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/drivers/${driverId}/files/${fileType}`,
    );
    return data;
  }

  async notifyFileUploaded(
    driverId: string,
    fileType: FileType,
    fileKey: string,
    contentType: string,
    fileName: string,
  ): Promise<any> {
    const notifyDto: NotifyFileUploadedDto = {
      userId: driverId,
      fileType: fileType,
      fileKey: fileKey,
      contentType: contentType,
      fileName: fileName,
    };

    this.logger.log(
      `Notifying file upload for driver ${driverId}, file type ${fileType}`,
    );
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/files/notify`,
      notifyDto,
      { timeout: 60000 },
    );

    this.logger.log(
      `Successfully notified file upload for driver ${driverId}, file type ${fileType}`,
    );
    return data;
  }

  async verifyFile(
    driverId: string,
    fileType: FileType,
    isVerified: boolean,
  ): Promise<any> {
    const { data } = await this.httpClient.put(
      `/drivers/${driverId}/files/${fileType}/verify`,
      { isVerified },
    );
    return data;
  }

  // Bank Information Methods
  async addBankInformation(
    driverId: string,
    bankInfoDto: CreateBankInformationDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/bank-info`,
      bankInfoDto,
    );
    return data;
  }

  async getAllBankInformation(driverId: string): Promise<any> {
    const { data } = await this.httpClient.get(
      `/drivers/${driverId}/bank-info`,
    );
    return data;
  }

  async deleteBankInformation(
    driverId: string,
    bankInfoId: string,
  ): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/drivers/${driverId}/bank-info/${bankInfoId}`,
    );
    return data;
  }

  async setDefaultBankInformation(
    driverId: string,
    bankInfoId: string,
  ): Promise<any> {
    const { data } = await this.httpClient.put(
      `/drivers/${driverId}/bank-info/${bankInfoId}/set-default`,
      {},
    );
    return data;
  }

  // Email and Phone Update Methods
  async initiateEmailUpdate(
    driverId: string,
    dto: InitiateEmailUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/initiate-email-update`,
      dto,
    );
    return data;
  }

  async completeEmailUpdate(
    driverId: string,
    dto: CompleteEmailUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/complete-email-update`,
      dto,
    );
    return data;
  }

  async initiatePhoneUpdate(
    driverId: string,
    dto: InitiatePhoneUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/initiate-phone-update`,
      dto,
    );
    return data;
  }

  async completePhoneUpdate(
    driverId: string,
    dto: CompletePhoneUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/complete-phone-update`,
      dto,
    );
    return data;
  }

  async updateNotificationPermissions(
    driverId: string,
    permissionsDto: UpdateNotificationPermissionsDto,
  ): Promise<any> {
    const { data } = await this.httpClient.patch(
      `/drivers/${driverId}/notification-permissions`,
      permissionsDto,
    );
    return data;
  }

  async updateProfile(
    driverId: string,
    updateProfileDto: UpdateDriverProfileDto,
  ): Promise<any> {
    const { data } = await this.httpClient.patch(
      `/drivers/${driverId}/profile`,
      updateProfileDto,
    );
    return data;
  }

  async updatePhoto(driverId: string, photoKey: string): Promise<any> {
    this.logger.log(`Updating photo for driver ${driverId}`);
    const { data } = await this.httpClient.put(`/drivers/${driverId}/photo`, {
      photoKey,
    });
    this.logger.log(`Successfully updated photo for driver ${driverId}`);
    return data;
  }

  async deletePhoto(driverId: string): Promise<any> {
    this.logger.log(`Deleting photo for driver ${driverId}`);
    const { data } = await this.httpClient.delete(`/drivers/${driverId}/photo`);
    this.logger.log(`Successfully deleted photo for driver ${driverId}`);
    return data;
  }

  async updateExpoToken(driverId: string, expoToken: string): Promise<any> {
    this.logger.log(`Updating expo token for driver ${driverId}`);
    const { data } = await this.httpClient.put(
      `/drivers/${driverId}/expo-token`,
      { expoToken },
    );
    this.logger.log(`Successfully updated expo token for driver ${driverId}`);
    return data;
  }

  async deleteExpoToken(driverId: string): Promise<any> {
    this.logger.log(`Deleting expo token for driver ${driverId}`);
    const { data } = await this.httpClient.delete(
      `/drivers/${driverId}/expo-token`,
    );
    this.logger.log(`Successfully deleted expo token for driver ${driverId}`);
    return data;
  }
}
