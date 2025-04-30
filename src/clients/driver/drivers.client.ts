import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance, AxiosError } from 'axios';
import { ClientsService } from '../clients.service';
import { FileType } from 'src/modules/drivers/enum/file-type.enum';
import { NotifyFileUploadedDto } from '../users/dto/notify-file-uploaded.dto';
import { DriverFilesStatusDto } from 'src/modules/drivers/dto/file-status.dto';
import {
  BankInformationDto,
  CreateBankInformationDto,
} from 'src/modules/drivers/dto/bank-information.dto';
import {
  CompanyInformationDto,
  CreateCompanyInformationDto,
} from 'src/modules/drivers/dto/company-information.dto';

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
  async createOrUpdateBankInformation(
    driverId: string,
    bankInfoDto: CreateBankInformationDto,
  ): Promise<BankInformationDto> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/bank-info`,
      bankInfoDto,
    );
    return data;
  }

  async getBankInformation(driverId: string): Promise<BankInformationDto> {
    const { data } = await this.httpClient.get(
      `/drivers/${driverId}/bank-info`,
    );
    return data;
  }

  async deleteBankInformation(driverId: string): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/drivers/${driverId}/bank-info`,
    );
    return data;
  }

  // Company Information Methods
  async createOrUpdateCompanyInformation(
    driverId: string,
    companyInfoDto: CreateCompanyInformationDto,
  ): Promise<CompanyInformationDto> {
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/company-info`,
      companyInfoDto,
    );
    return data;
  }

  async getCompanyInformation(
    driverId: string,
  ): Promise<CompanyInformationDto> {
    const { data } = await this.httpClient.get(
      `/drivers/${driverId}/company-info`,
    );
    return data;
  }

  async deleteCompanyInformation(driverId: string): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/drivers/${driverId}/company-info`,
    );
    return data;
  }
}
