import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { UserType } from '../common/user-type.enum';

@Injectable()
export class ConnectionStatusService {
  constructor(private readonly redisService: RedisService) {}

  async isDriverConnected(driverId: string): Promise<boolean> {
    return this.redisService.isDriverActive(driverId);
  }

  async isCustomerConnected(customerId: string): Promise<boolean> {
    return this.redisService.isCustomerActive(customerId);
  }
}
