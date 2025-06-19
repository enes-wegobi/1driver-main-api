import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import {
  ExpiredAckData,
  KeyspaceEventService,
} from 'src/redis/services/keyspace-event.service';
import { EventType } from './enum/event-type.enum';
import { EventDeliveryMethod } from './constants/trip.constant';
import { UserType } from 'src/common/user-type.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { LoggerService } from 'src/logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class Event2Service implements OnModuleInit {
  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly driversService: DriversService,
    private readonly customersService: CustomersService,
    private readonly expoNotificationsService: ExpoNotificationsService,
    private readonly logger: LoggerService,
    private readonly keyspaceEventService: KeyspaceEventService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Set up retry callback to avoid circular dependency
    this.keyspaceEventService.setRetryCallback(this.retryEvent.bind(this));
    this.logger.info('Event2Service initialized with retry callback');
  }

  generateEventId(): string {
    return `evt_${uuidv4().replace(/-/g, '')}`;
  }

  async sendToUser(
    userId: string,
    eventType: EventType,
    data: any,
    userType: UserType,
    tripId?: string,
  ): Promise<void> {
    try {
      const deliveryMethod = await this.determineDeliveryMethod(
        userId,
        userType,
      );

      if (deliveryMethod === EventDeliveryMethod.WEBSOCKET) {
        const eventData: ExpiredAckData = {
          eventId: this.generateEventId(),
          userId,
          userType,
          eventType,
          tripId,
          retryCount: 0,
          timestamp: new Date(),
          data,
        };
        await this.keyspaceEventService.createTTLKey(eventData);

        const eventDataWithId = {
          eventId: eventData.eventId,
          eventType,
          ...data,
        };

        await this.webSocketService.sendToUser(
          userId,
          eventType,
          eventDataWithId,
        );

        this.logger.info(
          `Sent ${eventType} to user ${userId} via WebSocket with ACK tracking`,
          {
            eventId: eventData.eventId,
            tripId,
            eventType,
            userId,
          },
        );
      } else {
        // For Push notification, no ACK tracking needed
        if (userType === UserType.DRIVER) {
          await this.sendPushNotificationToDriver(userId, eventType);
        } else if (userType === UserType.CUSTOMER) {
          await this.sendPushNotificationToCustomer(userId, eventType);
        }

        this.logger.info(
          `Sent ${eventType} to user ${userId} via Push Notification (no ACK)`,
          {
            tripId,
            eventType,
            userId,
          },
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error sending ${eventType} to user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Retry event method for TTL-based retries
   */
  async retryEvent(ackData: ExpiredAckData): Promise<void> {
    try {
      this.logger.info(`Retrying event ${ackData.eventId}`, {
        eventId: ackData.eventId,
        userId: ackData.userId,
        eventType: ackData.eventType,
        retryCount: ackData.retryCount,
      });

      // Yeni TTL key oluştur (retry count ile)
      const retryEventData: ExpiredAckData = {
        ...ackData,
        retryCount: ackData.retryCount,
        timestamp: new Date(),
      };

      await this.keyspaceEventService.createTTLKey(retryEventData);

      // Event'i tekrar gönder
      const eventDataWithId = {
        eventId: ackData.eventId,
        eventType: ackData.eventType,
        ...(ackData.data || {}),
      };

      await this.webSocketService.sendToUser(
        ackData.userId,
        ackData.eventType,
        eventDataWithId,
      );

      this.logger.info(
        `Event ${ackData.eventId} retried successfully (attempt ${ackData.retryCount})`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to retry event ${ackData.eventId}: ${error.message}`,
      );
    }
  }

  async sendToUsers(
    userIds: string[],
    eventType: EventType,
    data: any,
    userType: UserType,
    tripId?: string,
  ): Promise<void> {
    try {
      // First categorize users by their status
      const { activeUsers, inactiveUsers } = await this.categorizeUsersByStatus(
        userIds,
        userType,
      );

      // For active users (WebSocket), create events with ACK tracking
      const activeUserEventPromises = activeUsers.map(async (userId) => {
        const eventData: ExpiredAckData = {
          eventId: this.generateEventId(),
          userId,
          userType,
          eventType,
          tripId,
          retryCount: 0,
          timestamp: new Date(),
          data,
        };
        await this.keyspaceEventService.createTTLKey(eventData);

        // Add eventId to the data at the same level as eventType
        const eventDataWithId = {
          eventId: eventData.eventId,
          eventType,
          ...data,
        };

        return { userId, eventDataWithId };
      });

      // Create events for active users in parallel
      const activeEventsWithData = await Promise.all(activeUserEventPromises);
      const userEventDataMap = new Map(
        activeEventsWithData.map(({ userId, eventDataWithId }) => [
          userId,
          eventDataWithId,
        ]),
      );

      await this.broadcastEventWithAck(
        activeUsers,
        inactiveUsers,
        userType,
        eventType,
        userEventDataMap,
        data,
      );

      this.logger.info(
        `Sent ${eventType} to ${userIds.length} users (${activeUsers.length} active with ACK, ${inactiveUsers.length} inactive via push)`,
        {
          eventType,
          userCount: userIds.length,
          activeUsers: activeUsers.length,
          inactiveUsers: inactiveUsers.length,
          tripId,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error sending ${eventType} to users: ${error.message}`,
      );
    }
  }

  // ================================
  // PRIVATE DELIVERY METHODS
  // ================================

  private async broadcastEventWithAck(
    activeUsers: string[],
    inactiveUsers: string[],
    userType: UserType,
    eventType: EventType,
    userEventDataMap: Map<string, any>,
    originalData: any,
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // Send to active users via WebSocket with ACK tracking
    if (activeUsers.length > 0) {
      // For both drivers and customers, send individually to include unique eventId
      for (const userId of activeUsers) {
        const eventData = userEventDataMap.get(userId);
        if (eventData) {
          promises.push(
            this.webSocketService.sendToUser(userId, eventType, eventData),
          );
        }
      }
    }

    // Send to inactive users via Push Notification (no ACK needed)
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
