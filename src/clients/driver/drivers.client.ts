import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { FileType } from 'src/modules/drivers/enum/file-type.enum';
import { NotifyFileUploadedDto } from '../users/dto/notify-file-uploaded.dto';

@Injectable()
export class DriversClient {
  private readonly logger = new Logger(DriversClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('driver');
  }

  async findOne(id: string): Promise<any> {
    const { data } = await this.httpClient.get(`/drivers/${id}`);
    return data;
  }

  // Example: Update driver profile (adapt endpoint and DTO)
  // async updateProfile(id: string, profileData: UpdateDriverDto): Promise<any> {
  //   this.logger.log(`Updating profile for driver ${id} via driver service`);
  //   const { data } = await this.httpClient.patch(`/drivers/${id}/profile`, profileData);
  //   return data;
  // }

  // Example: Remove driver (adapt endpoint)
  // async remove(id: string): Promise<any> {
  //   this.logger.log(`Removing driver ${id} via driver service`);
  //   const { data } = await this.httpClient.delete(`/drivers/${id}`);
  //   return data;
  // }

  // Add other methods to interact with the driver microservice as needed
  
  /**
   * Check if a file of the specified type exists for the driver
   * @param driverId The driver ID
   * @param fileType The file type to check
   * @returns True if the file exists, false otherwise
   */
  async checkFileExists(driverId: string, fileType: FileType): Promise<boolean> {
    this.logger.log(`Checking if file of type ${fileType} exists for driver ${driverId}`);
    const { data } = await this.httpClient.get(`/drivers/${driverId}/files/${fileType}/exists`);
    return data.exists;
  }
  
  /**
   * Delete a file of the specified type for the driver
   * @param driverId The driver ID
   * @param fileType The file type to delete
   * @returns The result of the delete operation
   */
  async deleteFile(driverId: string, fileType: FileType): Promise<any> {
    this.logger.log(`Deleting file of type ${fileType} for driver ${driverId}`);
    const { data } = await this.httpClient.delete(`/drivers/${driverId}/files/${fileType}`);
    return data;
  }

  /**
   * Notify the driver service about a file upload
   * @param driverId The driver ID
   * @param fileType The type of file uploaded
   * @param fileKey The S3 file key
   * @returns The result of the notification
   */
  async notifyFileUploaded(driverId: string, fileType: FileType, fileKey: string): Promise<any> {
    this.logger.log(`Notifying file upload of type ${fileType} for driver ${driverId}`);
    const notifyDto: NotifyFileUploadedDto = {
      userId: driverId,
      fileType: fileType as any, // Type casting due to enum mismatch
      fileKey: fileKey
    };
    const { data } = await this.httpClient.post(`/drivers/${driverId}/files/notify`, notifyDto);
    return data;
  }
}
