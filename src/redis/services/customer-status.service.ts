import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { AppState } from 'src/common/enums/app-state.enum';

@Injectable()
export class CustomerStatusService extends BaseRedisService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  @WithErrorHandling()
  async markCustomerAsActive(customerId: string) {
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.customerActive(customerId);

    pipeline.set(key, new Date().toISOString());
    pipeline.expire(key, this.ACTIVE_CUSTOMER_EXPIRY);
    pipeline.sadd(RedisKeyGenerator.activeCustomersSet(), customerId);

    await pipeline.exec();
    return true;
  }

  @WithErrorHandling()
  async markCustomerAsInactive(customerId: string) {
    const pipeline = this.client.multi();
    const key = RedisKeyGenerator.customerActive(customerId);

    pipeline.del(key);
    pipeline.srem(RedisKeyGenerator.activeCustomersSet(), customerId);

    await pipeline.exec();
    return true;
  }

  @WithErrorHandling(false)
  async isCustomerActive(customerId: string): Promise<boolean> {
    const key = RedisKeyGenerator.customerActive(customerId);
    const result = await this.client.exists(key);

    return result === 1;
  }

  @WithErrorHandling([])
  async getActiveCustomers(): Promise<string[]> {
    return await this.client.smembers(RedisKeyGenerator.activeCustomersSet());
  }

  // ========== APP STATE METHODS ==========

  @WithErrorHandling()
  async updateCustomerAppState(
    customerId: string,
    appState: AppState,
  ): Promise<void> {
    const key = RedisKeyGenerator.customerAppState(customerId);
    const pipeline = this.client.multi();

    pipeline.set(key, appState);
    pipeline.expire(key, this.ACTIVE_CUSTOMER_EXPIRY);

    await pipeline.exec();

    this.logger.debug(
      `Customer ${customerId} app state updated to: ${appState}`,
    );
  }

  @WithErrorHandling(AppState.INACTIVE)
  async getCustomerAppState(customerId: string): Promise<AppState> {
    const key = RedisKeyGenerator.customerAppState(customerId);
    const appState = await this.client.get(key);

    return (appState as AppState) || AppState.INACTIVE;
  }

  @WithErrorHandling()
  async setCustomerAppStateOnConnect(customerId: string): Promise<void> {
    await this.updateCustomerAppState(customerId, AppState.ACTIVE);
  }

  @WithErrorHandling()
  async setCustomerAppStateOnDisconnect(customerId: string): Promise<void> {
    await this.updateCustomerAppState(customerId, AppState.INACTIVE);
  }
}
