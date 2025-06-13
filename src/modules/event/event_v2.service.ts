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
    if (userType === UserType.DRIVER) {
      const isActive = await this.driverStatusService.isDriverActive(userId);
      return isActive
        ? EventDeliveryMethod.WEBSOCKET
        : EventDeliveryMethod.PUSH;
    } else {
      const isActive =
        await this.customerStatusService.isCustomerActive(userId);
      return isActive
        ? EventDeliveryMethod.WEBSOCKET
        : EventDeliveryMethod.PUSH;
    }
  }

  private async categorizeUsersByStatus(
    userIds: string[],
    userType: UserType,
  ): Promise<{ activeUsers: string[]; inactiveUsers: string[] }> {
    if (userType === UserType.DRIVER) {
      const driversStatus =
        await this.driverStatusService.checkDriversActiveStatus(userIds);
      return driversStatus.reduce<{
        activeUsers: string[];
        inactiveUsers: string[];
      }>(
        (result, driver) => {
          if (driver.isActive) {
            result.activeUsers.push(driver.driverId);
          } else {
            result.inactiveUsers.push(driver.driverId);
          }
          return result;
        },
        { activeUsers: [], inactiveUsers: [] },
      );
    } else {
      // For customers, check individually
      const activeUsers: string[] = [];
      const inactiveUsers: string[] = [];

      for (const userId of userIds) {
        const isActive =
          await this.customerStatusService.isCustomerActive(userId);
        if (isActive) {
          activeUsers.push(userId);
        } else {
          inactiveUsers.push(userId);
        }
      }

      return { activeUsers, inactiveUsers };
    }
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
    if (customer && customer.expoToken) {
      const { title, body } = this.getNotificationContent(eventType);
      await this.expoNotificationsService.sendNotification(
        customer.expoToken,
        title,
        body,
        {
          ...data,
          type: eventType,
          timestamp: new Date().toISOString(),
        },
      );
    }
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
