import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { EventType } from './enum/event-type.enum';
import {
  EVENT_CONFIG,
  EventConfig,
  EventDeliveryMethod,
} from './constants/trip.constant';
import { UserType } from 'src/common/user-type.enum';
import { AppState } from 'src/common/enums/app-state.enum';

@Injectable()
export class Event2Service {
  private readonly logger = new Logger(Event2Service.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly driversService: DriversService,
    private readonly customersService: CustomersService,
    private readonly expoNotificationsService: ExpoNotificationsService,
  ) {}

  // ================================
  // PUBLIC API METHODS
  // ================================

  /**
   * Sends event to a single user
   */
  async sendToUser(
    userId: string,
    eventType: EventType,
    data: any,
  ): Promise<void> {
    try {
      const config = this.getEventConfig(eventType);

      await this.deliverEventToUser(
        userId,
        config.targetUserType,
        eventType,
        data,
      );

      this.logger.log(`Sent ${eventType} to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error sending ${eventType} to user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Sends event to multiple users
   */
  async sendToUsers(
    userIds: string[],
    eventType: EventType,
    data: any,
  ): Promise<void> {
    try {
      const config = this.getEventConfig(eventType);

      await this.broadcastEvent(
        userIds,
        config.targetUserType,
        eventType,
        data,
      );

      this.logger.log(`Sent ${eventType} to ${userIds.length} users`);
    } catch (error) {
      this.logger.error(
        `Error sending ${eventType} to users: ${error.message}`,
      );
    }
  }

  // ================================
  // PRIVATE DELIVERY METHODS
  // ================================

  private async broadcastEvent(
    userIds: string[],
    userType: UserType,
    eventType: EventType,
    data: any,
  ): Promise<void> {
    const { activeUsers, inactiveUsers } = await this.categorizeUsersByStatus(
      userIds,
      userType,
    );

    const promises: Promise<any>[] = [];

    // Send to active users via WebSocket
    if (activeUsers.length > 0) {
      if (userType === UserType.DRIVER) {
        promises.push(
          this.webSocketService.broadcastTripRequest(
            data,
            activeUsers,
            eventType,
          ),
        );
      } else {
        // For customers, send individually even in broadcast mode
        for (const userId of activeUsers) {
          promises.push(
            this.webSocketService.sendToUser(userId, eventType, data),
          );
        }
      }
    }

    // Send to inactive users via Push Notification
    if (inactiveUsers.length > 0) {
      if (userType === UserType.DRIVER) {
        const driverInfos = await this.driversService.findMany(inactiveUsers);
        promises.push(
          this.expoNotificationsService.sendTripRequestNotificationsToInactiveDrivers(
            driverInfos,
            data,
            eventType,
          ),
        );
      } else {
        // For customers, send individually
        for (const userId of inactiveUsers) {
          promises.push(
            this.sendPushNotificationToCustomer(userId, eventType, data),
          );
        }
      }
    }

    await Promise.all(promises);
  }

  private async deliverEventToUser(
    userId: string,
    userType: UserType,
    eventType: EventType,
    data: any,
  ): Promise<void> {
    const deliveryMethod = await this.determineDeliveryMethod(userId, userType);

    if (deliveryMethod === EventDeliveryMethod.WEBSOCKET) {
      await this.webSocketService.sendToUser(userId, eventType, data);
    } else {
      if (userType === UserType.DRIVER) {
        await this.sendPushNotificationToDriver(userId, eventType, data);
      } else {
        await this.sendPushNotificationToCustomer(userId, eventType, data);
      }
    }
  }

  private async determineDeliveryMethod(
    userId: string,
    userType: UserType,
  ): Promise<EventDeliveryMethod> {
    const isUserActiveAndReady = await this.isUserActiveAndReady(
      userId,
      userType,
    );
    return isUserActiveAndReady
      ? EventDeliveryMethod.WEBSOCKET
      : EventDeliveryMethod.PUSH;
  }

  /**
   * Common method to check if user is both active and has ACTIVE app state
   */
  private async isUserActiveAndReady(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    if (userType === UserType.DRIVER) {
      const isActive = await this.driverStatusService.isDriverActive(userId);
      const appState = await this.driverStatusService.getDriverAppState(userId);
      return isActive && appState === AppState.ACTIVE;
    } else {
      const isActive =
        await this.customerStatusService.isCustomerActive(userId);
      const appState =
        await this.customerStatusService.getCustomerAppState(userId);
      return isActive && appState === AppState.ACTIVE;
    }
  }

  private async categorizeUsersByStatus(
    userIds: string[],
    userType: UserType,
  ): Promise<{ activeUsers: string[]; inactiveUsers: string[] }> {
    const activeUsers: string[] = [];
    const inactiveUsers: string[] = [];

    // Use common method to check each user's status
    for (const userId of userIds) {
      const isActiveAndReady = await this.isUserActiveAndReady(
        userId,
        userType,
      );

      if (isActiveAndReady) {
        activeUsers.push(userId);
      } else {
        inactiveUsers.push(userId);
      }
    }

    return { activeUsers, inactiveUsers };
  }

  // ================================
  // PUSH NOTIFICATION METHODS
  // ================================

  private async sendPushNotificationToDriver(
    driverId: string,
    eventType: EventType,
    data: any,
  ): Promise<void> {
    const driver = await this.driversService.findOne(driverId);
    if (driver) {
      await this.expoNotificationsService.sendTripRequestNotificationToInactiveDriver(
        driver,
        data,
        eventType,
      );
    }
  }

  private async sendPushNotificationToCustomer(
    customerId: string,
    eventType: EventType,
    data: any,
  ): Promise<void> {
    const customer = await this.customersService.findOne(customerId);

    if (!customer) {
      this.logger.warn(`Customer ${customerId} not found`);
      return;
    }

    // Check notification permissions
    const hasPermission =
      await this.checkCustomerNotificationPermissions(customer);
    if (!hasPermission) {
      this.logger.log(
        `Customer ${customerId} does not have notification permissions, requesting...`,
      );
      await this.requestNotificationPermissions(customerId);
      return;
    }

    // Check expo token
    if (!customer.expoToken) {
      this.logger.warn(`Customer ${customerId} has no expo token`);
      return;
    }

    const { title, body } = this.getNotificationContent(eventType);

    await this.expoNotificationsService.sendNotification(
      customer.expoToken,
      title,
      body,
      {
        type: eventType,
        timestamp: new Date().toISOString(),
      },
    );
  }

  private getNotificationContent(eventType: EventType): {
    title: string;
    body: string;
  } {
    const notificationMap = {
      [EventType.TRIP_DRIVER_ASSIGNED]: {
        title: 'Trip Approved',
        body: 'A driver has approved your trip request!',
      },
      [EventType.TRIP_DRIVER_NOT_FOUND]: {
        title: 'No Drivers Available',
        body: "We couldn't find any available drivers for your trip.",
      },
      [EventType.TRIP_CANCELLED]: {
        title: 'Trip Cancelled',
        body: 'Your trip has been cancelled.',
      },
      [EventType.TRIP_DRIVER_EN_ROUTE]: {
        title: 'Driver En Route',
        body: 'Your driver is on the way to pick you up.',
      },
      [EventType.TRIP_DRIVER_ARRIVED]: {
        title: 'Driver Arrived',
        body: 'Your driver has arrived at the pickup location.',
      },
      [EventType.TRIP_STARTED]: {
        title: 'Trip Started',
        body: 'Your trip has started.',
      },
      [EventType.TRIP_PAYMENT_REQUIRED]: {
        title: 'Payment Required',
        body: 'Please complete payment for your trip.',
      },
    };

    return (
      notificationMap[eventType] || {
        title: 'Trip Update',
        body: 'You have a new trip update.',
      }
    );
  }

  // ================================
  // CUSTOMER NOTIFICATION HELPERS
  // ================================

  /**
   * Check if customer has mobile notification permissions
   */
  private async checkCustomerNotificationPermissions(
    customer: any,
  ): Promise<boolean> {
    try {
      //return customer?.mobileNotificationPermission === true;
      return true;
    } catch (error) {
      this.logger.error(
        `Error checking notification permissions for customer ${customer._id}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Dummy method to request notification permissions from customer
   * In a real implementation, this would trigger a permission request flow
   */
  private async requestNotificationPermissions(
    customerId: string,
  ): Promise<void> {
    this.logger.log(
      `Requesting notification permissions for customer ${customerId}`,
    );
    // TODO: Implement actual permission request logic
    // This could involve:
    // - Sending a WebSocket message to request permissions
    // - Storing a pending permission request in database
    // - Triggering a push notification asking for permissions
    // - Updating customer preferences when permissions are granted
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private getEventConfig(eventType: EventType): EventConfig {
    const config = EVENT_CONFIG[eventType];
    if (!config) {
      throw new Error(`No configuration found for event type: ${eventType}`);
    }
    return config;
  }
}
