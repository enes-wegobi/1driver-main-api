import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { AppState } from 'src/common/enums/app-state.enum';
import { LoggerService } from 'src/logger/logger.service';
import { UserType } from 'src/common/user-type.enum';
import { UnifiedUserStatusService } from './unified-user-status.service';

@Injectable()
export class CustomerStatusService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
    private readonly unifiedUserStatusService: UnifiedUserStatusService,
  ) {
    super(configService, customLogger);
  }

  @WithErrorHandling()
  async markCustomerAsActive(customerId: string) {
    await this.unifiedUserStatusService.setUserActive(customerId, UserType.CUSTOMER);
    return true;
  }

  @WithErrorHandling()
  async markCustomerAsInactive(customerId: string) {
    await this.unifiedUserStatusService.setUserInactive(customerId, UserType.CUSTOMER);
    return true;
  }

  @WithErrorHandling(false)
  async isCustomerActive(customerId: string): Promise<boolean> {
    return await this.unifiedUserStatusService.isUserActive(customerId, UserType.CUSTOMER);
  }

  @WithErrorHandling([])
  async getActiveCustomers(): Promise<string[]> {
    return await this.unifiedUserStatusService.getActiveUsers(UserType.CUSTOMER);
  }

  // ========== APP STATE METHODS ==========

  @WithErrorHandling()
  async updateCustomerAppState(
    customerId: string,
    appState: AppState,
  ): Promise<void> {
    await this.unifiedUserStatusService.updateAppState(customerId, UserType.CUSTOMER, appState);
  }

  @WithErrorHandling(AppState.FOREGROUND)
  async getCustomerAppState(customerId: string): Promise<AppState> {
    return await this.unifiedUserStatusService.getAppState(customerId, UserType.CUSTOMER) || AppState.FOREGROUND;
  }

  @WithErrorHandling()
  async setCustomerAppStateOnConnect(customerId: string): Promise<void> {
    await this.unifiedUserStatusService.updateAppState(customerId, UserType.CUSTOMER, AppState.FOREGROUND);
  }

  @WithErrorHandling()
  async setCustomerAppStateOnDisconnect(customerId: string): Promise<void> {
    await this.unifiedUserStatusService.setUserInactive(customerId, UserType.CUSTOMER);

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
