import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';

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
}
