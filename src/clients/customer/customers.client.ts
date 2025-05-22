import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { InitiateEmailUpdateDto } from './dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from './dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from './dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from './dto/complete-phone-update.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateNotificationPermissionsDto } from './dto/update-notification-permissions.dto';
import { SetActiveTripDto } from './dto/set-active-trip.dto';

@Injectable()
export class CustomersClient {
  private readonly logger = new Logger(CustomersClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findOne(id: string, fields?: string | string[]): Promise<any> {
    let url = `/customers/${id}`;

    if (fields) {
      const fieldsParam = Array.isArray(fields) ? fields.join(',') : fields;
      url += `?fields=${encodeURIComponent(fieldsParam)}`;
    }

    const { data } = await this.httpClient.get(url);
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

  async updateNotificationPermissions(
    userId: string,
    permissionsDto: UpdateNotificationPermissionsDto,
  ): Promise<any> {
    const { data } = await this.httpClient.patch(
      `/customers/${userId}/notification-permissions`,
      permissionsDto,
    );
    return data;
  }

  async updatePhoto(customerId: string, photoUrl: string): Promise<any> {
    this.logger.log(`Updating photo for customer ${customerId}`);
    const { data } = await this.httpClient.put(
      `/customers/${customerId}/photo`,
      { photoUrl },
    );
    this.logger.log(`Successfully updated photo for customer ${customerId}`);
    return data;
  }

  async deletePhoto(customerId: string): Promise<any> {
    this.logger.log(`Deleting photo for customer ${customerId}`);
    const { data } = await this.httpClient.delete(
      `/customers/${customerId}/photo`,
    );
    this.logger.log(`Successfully deleted photo for customer ${customerId}`);
    return data;
  }

  async updateExpoToken(customerId: string, expoToken: string): Promise<any> {
    this.logger.log(`Updating expo token for customer ${customerId}`);
    const { data } = await this.httpClient.put(
      `/customers/${customerId}/expo-token`,
      { expoToken },
    );
    this.logger.log(
      `Successfully updated expo token for customer ${customerId}`,
    );
    return data;
  }

  async deleteExpoToken(customerId: string): Promise<any> {
    this.logger.log(`Deleting expo token for customer ${customerId}`);
    const { data } = await this.httpClient.delete(
      `/customers/${customerId}/expo-token`,
    );
    this.logger.log(
      `Successfully deleted expo token for customer ${customerId}`,
    );
    return data;
  }

  async createSupportTicket(
    customerId: string,
    subject: string,
    description: string,
    fileKey: string | null,
  ): Promise<any> {
    this.logger.log(`Creating support ticket for customer ${customerId}`);
    const { data } = await this.httpClient.post(`/support`, {
      userId: customerId,
      subject,
      description,
      fileKey,
    });
    this.logger.log(
      `Successfully created support ticket for customer ${customerId}`,
    );
    return data;
  }

  async setActiveTrip(customerId: string, dto: SetActiveTripDto): Promise<any> {
    this.logger.log(`Setting active trip for customer ${customerId}`);
    const { data } = await this.httpClient.put(
      `/customers/${customerId}/active-trip`,
      dto,
    );
    this.logger.log(`Successfully set active trip for customer ${customerId}`);
    return data;
  }

  async removeActiveTrip(customerId: string): Promise<any> {
    this.logger.log(`Removing active trip for customer ${customerId}`);
    const { data } = await this.httpClient.delete(
      `/customers/${customerId}/active-trip`,
    );
    this.logger.log(
      `Successfully removed active trip for customer ${customerId}`,
    );
    return data;
  }

  async updateStripeCustomerId(
    customerId: string,
    stripeCustomerId: string,
  ): Promise<any> {
    this.logger.log(`Updating Stripe customer ID for customer ${customerId}`);
    const { data } = await this.httpClient.patch(
      `/customers/${customerId}/stripe-customer-id`,
      { stripeCustomerId },
    );
    this.logger.log(
      `Successfully updated Stripe customer ID for customer ${customerId}`,
    );
    return data;
  }

  async updateDefaultPaymentMethod(
    customerId: string,
    defaultPaymentMethodId: string,
  ): Promise<any> {
    this.logger.log(`Updating default payment method for customer ${customerId}`);
    const { data } = await this.httpClient.patch(
      `/customers/${customerId}/default-payment-method`,
      { defaultPaymentMethodId },
    );
    this.logger.log(
      `Successfully updated default payment method for customer ${customerId}`,
    );
    return data;
  }
}
