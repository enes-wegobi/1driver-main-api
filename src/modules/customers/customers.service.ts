import { Injectable } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly customersClient: CustomersClient) {}

  async findAll() {
    return this.customersClient.findAll();
  }

  async findOne(id: string) {
    return this.customersClient.findOne(id);
  }

  async updateProfile(id: string, profileData: UpdateCustomerDto) {
    return this.customersClient.updateProfile(id, profileData);
  }

  async remove(id: string) {
    return this.customersClient.remove(id);
  }

  async initiateEmailUpdate(userId: string, dto: InitiateEmailUpdateDto) {
    return this.customersClient.initiateEmailUpdate(userId, dto);
  }

  async completeEmailUpdate(userId: string, dto: CompleteEmailUpdateDto) {
    return this.customersClient.completeEmailUpdate(userId, dto);
  }

  async initiatePhoneUpdate(userId: string, dto: InitiatePhoneUpdateDto) {
    return this.customersClient.initiatePhoneUpdate(userId, dto);
  }

  async completePhoneUpdate(userId: string, dto: CompletePhoneUpdateDto) {
    return this.customersClient.completePhoneUpdate(userId, dto);
  }
}
