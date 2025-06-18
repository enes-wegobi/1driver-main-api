import { Injectable } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { EventType, isCriticalEvent } from './enum/event-type.enum';
import { EventDeliveryMethod } from './constants/trip.constant';
import { UserType } from 'src/common/user-type.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { LoggerService } from 'src/logger/logger.service';
import { ReliableEventService } from './services/reliable-event.service';
import { EventDeliveryResult } from './interfaces/reliable-event.interface';

@Injectable()
export class Event2Service {
  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly driversService: DriversService,
    private readonly customersService: CustomersService,
    private readonly expoNotificationsService: ExpoNotificationsService,
    private readonly logger: LoggerService,
    private readonly reliableEventService: ReliableEventService,
  ) {}

  // ================================
  // PUBLIC API METHODS
  // ================================

  /**
   * Sends event to a single user (with reliability for critical events)
   */
  async sendToUser(
    userId: string,
    eventType: EventType,
    data: any,
    userType: UserType,
  ): Promise<void> {
    try {
      // Use reliable delivery for critical events
      if (isCriticalEvent(eventType)) {
        await this.sendReliableEventToUser(userId, userType, eventType, data);
      } else {
        await this.deliverEventToUser(userId, userType, eventType, data);
      }

      this.logger.info(`Sent ${eventType} to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error sending ${eventType} to user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Sends event to multiple users (with reliability for critical events)
   */
  async sendToUsers(
    userIds: string[],
    eventType: EventType,
    data: any,
    userType: UserType,
  ): Promise<void> {
    try {
      // Use reliable delivery for critical events
      if (isCriticalEvent(eventType)) {
        await this.sendReliableEventToUsers(userIds, userType, eventType, data);
      } else {
        await this.broadcastEvent(userIds, userType, eventType, data);
      }

      this.logger.info(`Sent ${eventType} to ${userIds.length} users`);
    } catch (error) {
      this.logger.error(
        `Error sending ${eventType} to users: ${error.message}`,
      );
    }
  }

  /**
   * Send reliable event to a single user with acknowledgment tracking
   */
  async sendReliableEventToUser(
    userId: string,
    userType: UserType,
    eventType: EventType,
    data: any,
    requiresAck?: boolean,
  ): Promise<EventDeliveryResult> {
    try {
      const result = await this.reliableEventService.sendReliableEvent(
        userId,
        userType,
        eventType,
        data,
        requiresAck,
      );

      this.logger.info(
        `Reliable event ${eventType} sent to user ${userId}`,
        {
          eventId: result.eventId,
          deliveryMethod: result.deliveryMethod,
          success: result.success,
        },
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error sending reliable event ${eventType} to user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Send reliable events to multiple users
   */
  async sendReliableEventToUsers(
    userIds: string[],
    userType: UserType,
    eventType: EventType,
    data: any,
    requiresAck?: boolean,
  ): Promise<EventDeliveryResult[]> {
    try {
      const promises = userIds.map(userId =>
        this.reliableEventService.sendReliableEvent(
          userId,
          userType,
          eventType,
          data,
          requiresAck,
        ),
      );

      const results = await Promise.allSettled(promises);
      const deliveryResults: EventDeliveryResult[] = [];

      results.forEach((result, index) => {
        const userId = userIds[index];
        if (result.status === 'fulfilled') {
          deliveryResults.push(result.value);
          this.logger.info(
            `Reliable event ${eventType} sent to user ${userId}`,
            {
              eventId: result.value.eventId,
              deliveryMethod: result.value.deliveryMethod,
              success: result.value.success,
            },
          );
        } else {
          this.logger.error(
            `Failed to send reliable event ${eventType} to user ${userId}: ${result.reason}`,
          );
          deliveryResults.push({
            success: false,
            eventId: '',
            deliveryMethod: 'websocket',
            acknowledged: false,
            error: result.reason,
          });
        }
      });

      return deliveryResults;
    } catch (error) {
      this.logger.error(
        `Error sending reliable events ${eventType} to users: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get pending events for a user
   */
  async getPendingEventsForUser(userId: string) {
    return this.reliableEventService.getPendingEvents(userId);
  }

  /**
   * Acknowledge an event
   */
  async acknowledgeEvent(userId: string, eventId: string): Promise<boolean> {
    return this.reliableEventService.acknowledgeEvent(userId, eventId);
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
          this.webSocketService.broadcastToUsers(data, activeUsers, eventType),
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
        const { title, body } = this.getNotificationContent(eventType);
        promises.push(
          this.expoNotificationsService.sendMulticastNotification(
            driverInfos,
            title,
            body,
            {
              type: eventType,
              timestamp: new Date().toISOString(),
            },
          ),
        );
      } else if (userType === UserType.CUSTOMER) {
        // For customers, fetch individually and send as batch
        const customerPromises = inactiveUsers.map((userId) =>
          this.customersService.findOne(userId),
        );
        const customerInfos = await Promise.all(customerPromises);
        const validExpoTokens = customerInfos
          .filter((info) => info && info.expoToken)
          .map((info) => info.expoToken);

        if (validExpoTokens.length > 0) {
          const { title, body } = this.getNotificationContent(eventType);
          promises.push(
            this.expoNotificationsService.sendMulticastNotification(
              validExpoTokens,
              title,
              body,
              {
                type: eventType,
                timestamp: new Date().toISOString(),
              },
            ),
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
        await this.sendPushNotificationToDriver(userId, eventType);
      } else if (userType === UserType.CUSTOMER) {
        await this.sendPushNotificationToCustomer(userId, eventType);
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
      const appState = await this.driverStatusService.getDriverAppState(userId);
      return appState === AppState.FOREGROUND;
    } else {
      const appState =
        await this.customerStatusService.getCustomerAppState(userId);
      return appState === AppState.FOREGROUND;
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
  ): Promise<void> {
    const driver = await this.driversService.findOne(driverId);
    // Check notification permissions
    const hasPermission =
      await this.checkCustomerNotificationPermissions(driver);
    if (!hasPermission) {
      this.logger.info(
        `Driver ${driver} does not have notification permissions, requesting...`,
      );
      return;
    }

    if (!driver.expoToken) {
      this.logger.warn(`Driver ${driverId} has no expo token`);
      return;
    }

    if (driver) {
      const { title, body } = this.getNotificationContent(eventType);
      await this.expoNotificationsService.sendNotification(
        driver.expoToken,
        title,
        body,
        {
          type: eventType,
          timestamp: new Date().toISOString(),
        },
      );
    }
  }

  private async sendPushNotificationToCustomer(
    customerId: string,
    eventType: EventType,
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
      this.logger.info(
        `Customer ${customerId} does not have notification permissions, requesting...`,
      );
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
}
