import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { AppState } from 'src/common/enums/app-state.enum';
import { LoggerService } from 'src/logger/logger.service';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class CustomerStatusService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
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
  }

  @WithErrorHandling()
  async getCustomerAppState(customerId: string): Promise<AppState> {
    const key = RedisKeyGenerator.customerAppState(customerId);
    const appState = await this.client.get(key);

    return (appState as AppState) || null;
  }

  @WithErrorHandling()
  async setCustomerAppStateOnConnect(customerId: string): Promise<void> {
    await this.updateCustomerAppState(customerId, AppState.FOREGROUND);
  }

  @WithErrorHandling()
  async setCustomerAppStateOnDisconnect(customerId: string): Promise<void> {
    const key = RedisKeyGenerator.customerAppState(customerId);
    const pipeline = this.client.multi();

    pipeline.del(key);

    await pipeline.exec();

    this.customLogger.debug(
      `Customer ${customerId} app state deleted on disconnect`,
      {
        userId: customerId,
        userType: UserType.CUSTOMER,
        action: 'delete_app_state_on_disconnect',
      },
    );
  }
}
