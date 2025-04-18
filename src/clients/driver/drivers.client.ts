import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { FileType } from 'src/modules/drivers/enum/file-type.enum';
import { NotifyFileUploadedDto } from '../users/dto/notify-file-uploaded.dto';
import { DriverFilesStatusDto } from 'src/modules/drivers/dto/file-status.dto';

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
    const { data } = await this.httpClient.post(
      `/drivers/${driverId}/files/notify`,
      notifyDto,
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
      { isVerified }
    );
    return data;
  }

  async getDriverFiles(driverId: string): Promise<DriverFilesStatusDto> {
    const { data } = await this.httpClient.get(`/drivers/${driverId}/files`);
    return data;
  }
}
