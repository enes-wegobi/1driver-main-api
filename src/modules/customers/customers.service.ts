import { Injectable } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { CreateAddressDto } from 'src/clients/customer/dto/create-address.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';
import { UpdateNotificationPermissionsDto } from 'src/clients/customer/dto/update-notification-permissions.dto';
import { LoggerService } from 'src/logger/logger.service';
import { PaymentMethodService } from '../payments/services/payment-method.service';

@Injectable()
export class CustomersService {
  constructor(
    private readonly customersClient: CustomersClient,
    private readonly logger: LoggerService,
  ) {}

  async findOne(id: string, fields?: string | string[]) {
    const customer = await this.customersClient.findOne(id, fields);

    return customer;
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

  async addAddress(userId: string, addressDto: CreateAddressDto) {
    return this.customersClient.addAddress(userId, addressDto);
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.customersClient.deleteAddress(userId, addressId);
  }

  async updateNotificationPermissions(
    userId: string,
    permissionsDto: UpdateNotificationPermissionsDto,
  ) {
    return this.customersClient.updateNotificationPermissions(
      userId,
      permissionsDto,
    );
  }

  async updatePhoto(customerId: string, photoUrl: string): Promise<any> {
    return this.customersClient.updatePhoto(customerId, photoUrl);
  }

  async deletePhoto(customerId: string): Promise<any> {
    return this.customersClient.deletePhoto(customerId);
  }

  async updateExpoToken(customerId: string, expoToken: string): Promise<any> {
    return this.customersClient.updateExpoToken(customerId, expoToken);
  }

  async deleteExpoToken(customerId: string): Promise<any> {
    return this.customersClient.deleteExpoToken(customerId);
  }

  async updateStripeCustomerId(
    customerId: string,
    stripeCustomerId: string,
  ): Promise<any> {
    return this.customersClient.updateStripeCustomerId(
      customerId,
      stripeCustomerId,
    );
  }

  async updateDefaultPaymentMethod(
    customerId: string,
    defaultPaymentMethodId: string,
  ): Promise<any> {
    return this.customersClient.updateDefaultPaymentMethod(
      customerId,
      defaultPaymentMethodId,
    );
  }

  async updateDriverRate(driverId: string, rate: number): Promise<any> {
    return this.customersClient.updateDriverRate(driverId, rate);
  }
}
