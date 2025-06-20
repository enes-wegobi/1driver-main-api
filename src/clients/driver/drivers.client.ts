import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { FileType } from 'src/modules/drivers/enum/file-type.enum';
import { NotifyFileUploadedDto } from './dto/notify-file-uploaded.dto';
import { CreateBankInformationDto } from 'src/modules/drivers/dto/bank-information.dto';
import { UpdateNotificationPermissionsDto, SetActiveTripDto } from './dto';
import { UpdateDriverProfileDto } from 'src/modules/drivers/dto/update-driver-profile.dto';
import {
  CompleteEmailUpdateDto,
  CompletePhoneUpdateDto,
  InitiateEmailUpdateDto,
  InitiatePhoneUpdateDto,
} from '../customer/dto';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class DriversClient {
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly clientsService: ClientsService,
    private readonly logger: LoggerService,
  ) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findOne(id: string, fields?: string | string[]): Promise<any> {
    let url = `/drivers/${id}`;

    if (fields) {
      const fieldsParam = Array.isArray(fields) ? fields.join(',') : fields;
      url += `?fields=${encodeURIComponent(fieldsParam)}`;
    }

    const { data } = await this.httpClient.get(url);
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

    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/files/notify`,
      notifyDto,
      { timeout: 60000 },
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

  async updatePhoto(driverId: string, photoUrl: string): Promise<any> {
    const { data } = await this.httpClient.put(`/drivers/${driverId}/photo`, {
      photoUrl,
    });
    return data;
  }

  async deletePhoto(driverId: string): Promise<any> {
    const { data } = await this.httpClient.delete(`/drivers/${driverId}/photo`);
    return data;
  }

  async updateExpoToken(driverId: string, expoToken: string): Promise<any> {
    const { data } = await this.httpClient.put(
      `/drivers/${driverId}/expo-token`,
      { expoToken },
    );
    return data;
  }

  async deleteExpoToken(driverId: string): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/drivers/${driverId}/expo-token`,
    );
    return data;
  }

  async setActiveTrip(driverId: string, dto: SetActiveTripDto): Promise<any> {
    const { data } = await this.httpClient.put(
      `/drivers/${driverId}/active-trip`,
      dto,
    );
    return data;
  }

  async updateCustomerRate(customerId: string, rate: number): Promise<any> {
    const { data } = await this.httpClient.patch(
      `/customers/${customerId}/rate`,
      { rate },
    );
    return data;
  }
}
