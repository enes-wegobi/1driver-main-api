import { Injectable } from '@nestjs/common';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';

@Injectable()
export class ConnectionStatusService {
  constructor(
    private readonly customerStatusService: CustomerStatusService,
    private readonly driverStatusService: DriverStatusService,
  ) {}

  async isDriverConnected(driverId: string): Promise<boolean> {
    return this.driverStatusService.isDriverActive(driverId);
  }

  async isCustomerConnected(customerId: string): Promise<boolean> {
    return this.customerStatusService.isCustomerActive(customerId);
  }
}
