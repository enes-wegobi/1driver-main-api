import { Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { InitiateEmailUpdateDto } from './dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from './dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from './dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from './dto/complete-phone-update.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class CustomersClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findAll(): Promise<any> {
    const { data } = await this.httpClient.get('/customers');
    return data;
  }

  async findOne(id: string): Promise<any> {
    const { data } = await this.httpClient.get(`/customers/${id}`);
    return data;
  }

  async updateProfile(
    id: string,
    profileData: UpdateCustomerDto,
  ): Promise<any> {
    const { data } = await this.httpClient.patch(
      `/customers/${id}/profile`,
      profileData,
    );
    return data;
  }

  async remove(id: string): Promise<any> {
    const { data } = await this.httpClient.delete(`/customers/${id}`);
    return data;
  }

  async initiateEmailUpdate(
    userId: string,
    dto: InitiateEmailUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/initiate-email-update`,
      dto,
    );
    return data;
  }

  async completeEmailUpdate(
    userId: string,
    dto: CompleteEmailUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/complete-email-update`,
      dto,
    );
    return data;
  }

  async initiatePhoneUpdate(
    userId: string,
    dto: InitiatePhoneUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/initiate-phone-update`,
      dto,
    );
    return data;
  }

  async completePhoneUpdate(
    userId: string,
    dto: CompletePhoneUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/complete-phone-update`,
      dto,
    );
    return data;
  }

  async addAddress(userId: string, addressDto: CreateAddressDto): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/addresses`,
      addressDto,
    );
    return data;
  }

  async deleteAddress(userId: string, addressId: string): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/customers/${userId}/addresses/${addressId}`,
    );
    return data;
  }
}
