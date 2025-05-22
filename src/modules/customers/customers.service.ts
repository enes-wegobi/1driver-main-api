import { Injectable, Logger } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { CreateAddressDto } from 'src/clients/customer/dto/create-address.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';
import { UpdateNotificationPermissionsDto } from 'src/clients/customer/dto/update-notification-permissions.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly customersClient: CustomersClient) {}

  async findOne(id: string, fields?: string | string[]) {
    return this.customersClient.findOne(id, fields);
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
    this.logger.log(`Updating photo for customer ${customerId}`);
    return this.customersClient.updatePhoto(customerId, photoUrl);
  }

  async deletePhoto(customerId: string): Promise<any> {
    this.logger.log(`Deleting photo for customer ${customerId}`);
    return this.customersClient.deletePhoto(customerId);
  }

  async updateExpoToken(customerId: string, expoToken: string): Promise<any> {
    this.logger.log(`Updating expo token for customer ${customerId}`);
    return this.customersClient.updateExpoToken(customerId, expoToken);
  }

  async deleteExpoToken(customerId: string): Promise<any> {
    this.logger.log(`Deleting expo token for customer ${customerId}`);
    return this.customersClient.deleteExpoToken(customerId);
  }

  async updateStripeCustomerId(
    customerId: string,
    stripeCustomerId: string,
  ): Promise<any> {
    this.logger.log(`Updating Stripe customer ID for customer ${customerId}`);
    return this.customersClient.updateStripeCustomerId(
      customerId,
      stripeCustomerId,
    );
  }

  async updateDefaultPaymentMethod(
    customerId: string,
    defaultPaymentMethodId: string,
  ): Promise<any> {
    this.logger.log(`Updating default payment method for customer ${customerId}`);
    return this.customersClient.updateDefaultPaymentMethod(
      customerId,
      defaultPaymentMethodId,
    );
  }
}
