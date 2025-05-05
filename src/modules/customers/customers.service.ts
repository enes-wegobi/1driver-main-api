import { Injectable, Logger } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { CreateAddressDto } from 'src/clients/customer/dto/create-address.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';
import { UpdateNotificationPermissionsDto } from 'src/clients/customer/dto/update-notification-permissions.dto';
import { WebSocketService } from 'src/websocket/websocket.service';
import { RedisService } from 'src/redis/redis.service';
import { NearbyDriversResponseDto } from 'src/modules/trips/dto/nearby-drivers-response.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly customersClient: CustomersClient,
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService
  ) {}

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

  async addAddress(userId: string, addressDto: CreateAddressDto) {
    return this.customersClient.addAddress(userId, addressDto);
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.customersClient.deleteAddress(userId, addressId);
  }

  async updateNotificationPermissions(
    userId: string, 
    permissionsDto: UpdateNotificationPermissionsDto
  ) {
    return this.customersClient.updateNotificationPermissions(userId, permissionsDto);
  }

  /**
   * Find nearby available drivers for a customer
   */
  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<NearbyDriversResponseDto> {
    this.logger.debug(
      `Finding nearby drivers at [${latitude}, ${longitude}] with radius ${radius}km`,
    );

    const drivers = await this.redisService.findNearbyAvailableDrivers(
      latitude,
      longitude,
      radius,
    );

    return {
      total: drivers.length,
      drivers: drivers.map((driver) => ({
        driverId: driver.userId,
        distance: driver.distance,
        location: {
          latitude: driver.coordinates.latitude,
          longitude: driver.coordinates.longitude,
        },
        availabilityStatus: driver.availabilityStatus,
        lastUpdated: driver.updatedAt,
      })),
    };
  }

  /**
   * Subscribe a customer to nearby driver updates
   */
  async subscribeToNearbyDriverUpdates(
    clientId: string,
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<boolean> {
    // Store the subscription parameters in Redis for later use
    await this.redisService.getRedisClient().hSet(`subscription:${clientId}`, {
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      createdAt: new Date().toISOString(),
    });

    // Set expiration for the subscription data (30 minutes)
    await this.redisService
      .getRedisClient()
      .expire(`subscription:${clientId}`, 1800);

    return true;
  }

  /**
   * Unsubscribe a customer from nearby driver updates
   */
  async unsubscribeFromNearbyDriverUpdates(clientId: string): Promise<boolean> {
    // Remove the subscription data from Redis
    await this.redisService.getRedisClient().del(`subscription:${clientId}`);
    return true;
  }
}
