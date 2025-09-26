import { Injectable } from '@nestjs/common';
import { GetAdminCustomersQueryDto } from '../dto/get-admin-customers-query.dto';
import { AdminCustomerListResponseDto, AdminCustomerListItemDto } from '../dto/admin-customer-list-response.dto';
import { AdminCustomerDetailResponseDto, AdminCustomerAddressDto, AdminCustomerPaymentMethodDto } from '../dto/admin-customer-detail-response.dto';
import { PaymentMethodService } from '../../payments/services/payment-method.service';
import { CustomersService } from '../../customers/customers.service';

@Injectable()
export class AdminCustomerService {
  constructor(
    private readonly customersService: CustomersService,
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  async getAllCustomers(query: GetAdminCustomersQueryDto): Promise<AdminCustomerListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.customersService.findAll({
      page,
      limit,
      search: query.search,
    });

    const mappedCustomers = result.items?.map(customer => this.mapCustomerToListItem(customer)) || [];

    return {
      customers: mappedCustomers,
      pagination: {
        page: result.page || page,
        limit: result.limit || limit,
        total: result.total || 0,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / limit)
      }
    };
  }

  async getCustomerById(customerId: string): Promise<AdminCustomerDetailResponseDto | null> {
    const customer = await this.customersService.findOne(customerId);

    if (!customer) {
      return null;
    }
    let paymentMethods: AdminCustomerPaymentMethodDto[] = [];
    const customerPaymentMethods = await this.paymentMethodService.getPaymentMethods(customer._id);
    paymentMethods = customerPaymentMethods?.map(pm => this.mapPaymentMethod(pm)) || [];

    return this.mapCustomerToDetail(customer, paymentMethods);
  }

  private mapCustomerToListItem(customer: any): AdminCustomerListItemDto {
    return {
      id: customer.id || customer._id,
      name: customer.name,
      surname: customer.surname,
      email: customer.email,
      phone: customer.phone,
    };
  }

  private mapCustomerToDetail(customer: any, paymentMethods: AdminCustomerPaymentMethodDto[]): AdminCustomerDetailResponseDto {
    const addresses = customer.addresses?.map(address => this.mapAddress(address)) || [];

    return {
      id: customer.id || customer._id,
      name: customer.name,
      surname: customer.surname,
      email: customer.email,
      phone: customer.phone,
      vehicle: {
        transmissionType: customer.vehicle.transmissionType,
        licensePlate: customer.vehicle.licensePlate,
      },
      dateOfBirth: customer.dateOfBirth,
      identityNumber: customer.identityNumber,
      photoUrl: customer.photoUrl ? customer.photoUrl : undefined,
      rate: customer.rate,
      addresses,
      paymentMethods,
    };
  }

  private mapAddress(address: any): AdminCustomerAddressDto {
    const coordinates = address.location?.coordinates
      ? { lat: address.location.coordinates[1], lng: address.location.coordinates[0] }
      : { lat: 0, lng: 0 };

    return {
      id: address.id || address._id,
      label: address.label || '',
      formatted_address: address.formatted_address || '',
      street_number: address.street_number || '',
      route: address.route || '',
      neighborhood: address.neighborhood || '',
      locality: address.locality || '',
      administrative_area_level_2: address.administrative_area_level_2 || '',
      administrative_area_level_1: address.administrative_area_level_1 || '',
      postal_code: address.postal_code || '',
      country: address.country || '',
      country_code: address.country_code || '',
      timezone: address.timezone || '',
      place_id: address.place_id || '',
      coordinates,
      additional_info: address.additional_info || '',
      isDefault: address.isDefault || false,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private mapPaymentMethod(pm: any): AdminCustomerPaymentMethodDto {
    return {
      brand: pm.card?.brand || pm.brand,
      last4: pm.card?.last4 || pm.last4,
      expiryMonth: pm.card?.exp_month || pm.expiryMonth,
      expiryYear: pm.card?.exp_year || pm.expiryYear,
      isDefault: pm.isDefault || false,
    };
  }
}