import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UserType } from '../common/user-type.enum';

@Injectable()
export class ConnectionStatusService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Check if a driver is connected to WebSocket
   * @param driverId The driver ID to check
   * @returns True if the driver is connected, false otherwise
   */
  async isDriverConnected(driverId: string): Promise<boolean> {
    return this.redisService.isDriverActive(driverId);
  }

  /**
   * Check if a customer is connected to WebSocket
   * @param customerId The customer ID to check
   * @returns True if the customer is connected, false otherwise
   */
  async isCustomerConnected(customerId: string): Promise<boolean> {
    return this.redisService.isCustomerActive(customerId);
  }
}
