import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from 'src/redis/services/base-redis.service';
import { WithErrorHandling } from 'src/redis/decorators/with-error-handling.decorator';
import { LoggerService } from 'src/logger/logger.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import {
  PendingEvent,
  EventDeliveryResult,
  RetryConfig,
  PendingEventsResponse,
} from '../interfaces/reliable-event.interface';
import { EventType, isCriticalEvent, isHighPriorityEvent } from '../enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReliableEventService extends BaseRedisService {
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelays: [5000, 15000, 30000], // 5s, 15s, 30s
    fallbackToPush: true,
  };

  private readonly highPriorityRetryConfig: RetryConfig = {
    maxRetries: 5,
    retryDelays: [2000, 5000, 10000, 20000, 40000], // 2s, 5s, 10s, 20s, 40s
    fallbackToPush: true,
  };

  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
    private readonly webSocketService: WebSocketService,
    private readonly expoNotificationsService: ExpoNotificationsService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly driversService: DriversService,
    private readonly customersService: CustomersService,
  ) {
    super(configService, customLogger);
  }

  // ================================
  // PUBLIC API METHODS
  // ================================

  /**
   * Send a reliable event with acknowledgment tracking
   */
  @WithErrorHandling()
  async sendReliableEvent(
    userId: string,
    userType: UserType,
    eventType: EventType,
    data: any,
    requiresAck?: boolean,
  ): Promise<EventDeliveryResult> {
    const shouldRequireAck = requiresAck ?? isCriticalEvent(eventType);
    const retryConfig = isHighPriorityEvent(eventType)
      ? this.highPriorityRetryConfig
      : this.defaultRetryConfig;

    const event: PendingEvent = {
      id: this.generateEventId(),
      userId,
      userType,
      eventType,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: retryConfig.maxRetries,
      requiresAck: shouldRequireAck,
    };

    this.customLogger.info(
      `Sending reliable event ${eventType} to user ${userId}`,
      {
        eventId: event.id,
        userId,
        userType,
        eventType,
        requiresAck: shouldRequireAck,
      },
    );

    // Store event if it requires acknowledgment
    if (shouldRequireAck) {
      await this.storePendingEvent(event);
    }

    // Attempt delivery
    const result = await this.attemptDelivery(event);

    // Schedule retry if needed
    if (shouldRequireAck && (!result.success || !result.acknowledged)) {
      await this.scheduleRetry(event, retryConfig);
    }

    return result;
  }

  /**
   * Acknowledge an event
   */
  @WithErrorHandling(false)
  async acknowledgeEvent(userId: string, eventId: string): Promise<boolean> {
    try {
      const pipeline = this.client.multi();

      // Remove from pending events
      pipeline.srem(`pending_events:${userId}`, eventId);

      // Remove event data
      pipeline.del(`event_data:${eventId}`);

      // Remove from retry queue
      pipeline.zrem('event_retry_queue', eventId);

      await pipeline.exec();

      this.customLogger.info(`Event ${eventId} acknowledged by user ${userId}`, {
        eventId,
        userId,
        action: 'event_acknowledged',
      });

      return true;
    } catch (error) {
      this.customLogger.error(
        `Failed to acknowledge event ${eventId} for user ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  /**
   * Get pending events for a user
   */
  @WithErrorHandling({ userId: '', events: [], totalCount: 0 })
  async getPendingEvents(userId: string): Promise<PendingEventsResponse> {
    try {
      const eventIds = await this.client.smembers(`pending_events:${userId}`);
      const events: PendingEvent[] = [];

      for (const eventId of eventIds) {
        const eventData = await this.client.get(`event_data:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData) as PendingEvent;
          // Convert timestamp back to Date object
          event.timestamp = new Date(event.timestamp);
          events.push(event);
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return {
        userId,
        events,
        totalCount: events.length,
      };
    } catch (error) {
      this.customLogger.error(
        `Failed to get pending events for user ${userId}: ${error.message}`,
      );
      return { userId, events: [], totalCount: 0 };
    }
  }

  /**
   * Get events ready for retry
   */
  @WithErrorHandling([])
  async getEventsReadyForRetry(): Promise<PendingEvent[]> {
    try {
      const now = Date.now();

      // Get event IDs that are ready for retry
      const eventIds = await this.client.zrangebyscore(
        'event_retry_queue',
        0,
        now,
      );

      const events: PendingEvent[] = [];

      for (const eventId of eventIds) {
        const eventData = await this.client.get(`event_data:${eventId}`);
        if (eventData) {
          const event = JSON.parse(eventData) as PendingEvent;
          event.timestamp = new Date(event.timestamp);
          events.push(event);
        }
      }

      return events;
    } catch (error) {
      this.customLogger.error(
        `Failed to get events ready for retry: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Retry an event
   */
  @WithErrorHandling()
  async retryEvent(event: PendingEvent): Promise<EventDeliveryResult> {
    event.retryCount++;

    this.customLogger.info(
      `Retrying event ${event.id} (attempt ${event.retryCount}/${event.maxRetries})`,
      {
        eventId: event.id,
        userId: event.userId,
        eventType: event.eventType,
        retryCount: event.retryCount,
        maxRetries: event.maxRetries,
      },
    );

    // Update event in storage
    await this.updatePendingEvent(event);

    // Attempt delivery
    const result = await this.attemptDelivery(event);

    // Schedule next retry or fallback to push
    if (!result.success || !result.acknowledged) {
      if (event.retryCount < event.maxRetries) {
        const retryConfig = isHighPriorityEvent(event.eventType)
          ? this.highPriorityRetryConfig
          : this.defaultRetryConfig;
        await this.scheduleRetry(event, retryConfig);
      } else {
        // Max retries reached, fallback to push notification
        await this.fallbackToPushNotification(event);
      }
    }

    return result;
  }

  /**
   * Clean up expired events
   */
  @WithErrorHandling(0)
  async cleanupExpiredEvents(): Promise<number> {
    try {
      const expiredTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      let cleanedCount = 0;

      // Get expired events from retry queue
      const expiredEventIds = await this.client.zrangebyscore(
        'event_retry_queue',
        0,
        expiredTime,
      );

      for (const eventId of expiredEventIds) {
        await this.removeEvent(eventId);
        cleanedCount++;
      }

      this.customLogger.info(`Cleaned up ${cleanedCount} expired events`);
      return cleanedCount;
    } catch (error) {
      this.customLogger.error(`Failed to cleanup expired events: ${error.message}`);
      return 0;
    }
  }

  // ================================
  // PRIVATE HELPER METHODS
  // ================================

  private generateEventId(): string {
    return `evt_${uuidv4().replace(/-/g, '')}`;
  }

  private async storePendingEvent(event: PendingEvent): Promise<void> {
    const pipeline = this.client.multi();

    // Store event data with TTL
    pipeline.setex(
      `event_data:${event.id}`,
      3600, // 1 hour TTL
      JSON.stringify(event),
    );

    // Add to user's pending events set
    pipeline.sadd(`pending_events:${event.userId}`, event.id);
    pipeline.expire(`pending_events:${event.userId}`, 3600);

    await pipeline.exec();
  }

  private async updatePendingEvent(event: PendingEvent): Promise<void> {
    await this.client.setex(
      `event_data:${event.id}`,
      3600,
      JSON.stringify(event),
    );
  }

  private async scheduleRetry(
    event: PendingEvent,
    retryConfig: RetryConfig,
  ): Promise<void> {
    const retryDelay = this.calculateRetryDelay(event.retryCount, retryConfig);
    const retryTime = Date.now() + retryDelay;

    // Add to retry queue with retry time as score
    await this.client.zadd('event_retry_queue', retryTime, event.id);

    this.customLogger.debug(
      `Scheduled retry for event ${event.id} in ${retryDelay}ms`,
      {
        eventId: event.id,
        retryDelay,
        retryTime: new Date(retryTime).toISOString(),
      },
    );
  }

  private calculateRetryDelay(
    retryCount: number,
    retryConfig: RetryConfig,
  ): number {
    const delayIndex = Math.min(retryCount - 1, retryConfig.retryDelays.length - 1);
    return retryConfig.retryDelays[delayIndex] || 60000; // Default 1 minute
  }

  private async attemptDelivery(event: PendingEvent): Promise<EventDeliveryResult> {
    try {
      // Check if user is online and in foreground
      const isOnlineAndActive = await this.isUserOnlineAndActive(
        event.userId,
        event.userType,
      );

      if (isOnlineAndActive) {
        // Send via WebSocket
        await this.webSocketService.sendToUser(event.userId, event.eventType, {
          id: event.id,
          ...event.data,
          requiresAck: event.requiresAck,
          timestamp: event.timestamp.toISOString(),
        });

        return {
          success: true,
          eventId: event.id,
          deliveryMethod: 'websocket',
          acknowledged: false, // Will be acknowledged separately
        };
      } else {
        // Send via push notification
        const pushResult = await this.sendPushNotification(event);
        return {
          success: pushResult,
          eventId: event.id,
          deliveryMethod: 'push',
          acknowledged: true, // Push notifications don't require ACK
        };
      }
    } catch (error) {
      this.customLogger.error(
        `Event delivery failed for ${event.id}: ${error.message}`,
      );
      return {
        success: false,
        eventId: event.id,
        deliveryMethod: 'websocket',
        acknowledged: false,
        error: error.message,
      };
    }
  }

  private async isUserOnlineAndActive(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    try {
      if (userType === UserType.DRIVER) {
        const appState = await this.driverStatusService.getDriverAppState(userId);
        return appState === AppState.FOREGROUND;
      } else {
        const appState = await this.customerStatusService.getCustomerAppState(userId);
        return appState === AppState.FOREGROUND;
      }
    } catch (error) {
      this.customLogger.error(
        `Failed to check user online status for ${userId}: ${error.message}`,
      );
      return false;
    }
  }

  private async sendPushNotification(event: PendingEvent): Promise<boolean> {
    try {
      const { title, body } = this.getNotificationContent(event.eventType);

      if (event.userType === UserType.DRIVER) {
        const driver = await this.driversService.findOne(event.userId);
        if (driver?.expoToken) {
          await this.expoNotificationsService.sendNotification(
            driver.expoToken,
            title,
            body,
            {
              type: event.eventType,
              eventId: event.id,
              timestamp: event.timestamp.toISOString(),
            },
          );
          return true;
        }
      } else {
        const customer = await this.customersService.findOne(event.userId);
        if (customer?.expoToken) {
          await this.expoNotificationsService.sendNotification(
            customer.expoToken,
            title,
            body,
            {
              type: event.eventType,
              eventId: event.id,
              timestamp: event.timestamp.toISOString(),
            },
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      this.customLogger.error(
        `Failed to send push notification for event ${event.id}: ${error.message}`,
      );
      return false;
    }
  }

  private async fallbackToPushNotification(event: PendingEvent): Promise<void> {
    this.customLogger.warn(
      `Max retries reached for event ${event.id}, falling back to push notification`,
      {
        eventId: event.id,
        userId: event.userId,
        eventType: event.eventType,
        retryCount: event.retryCount,
      },
    );

    const pushResult = await this.sendPushNotification(event);

    if (pushResult) {
      // Remove from pending events since push was sent
      await this.removeEvent(event.id);
    } else {
      this.customLogger.error(
        `Failed to send fallback push notification for event ${event.id}`,
      );
    }
  }

  private async removeEvent(eventId: string): Promise<void> {
    try {
      // Get event data to find userId
      const eventData = await this.client.get(`event_data:${eventId}`);
      if (eventData) {
        const event = JSON.parse(eventData) as PendingEvent;
        
        const pipeline = this.client.multi();
        pipeline.srem(`pending_events:${event.userId}`, eventId);
        pipeline.del(`event_data:${eventId}`);
        pipeline.zrem('event_retry_queue', eventId);
        await pipeline.exec();
      }
    } catch (error) {
      this.customLogger.error(`Failed to remove event ${eventId}: ${error.message}`);
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
      [EventType.TRIP_COMPLETED]: {
        title: 'Trip Completed',
        body: 'Your trip has been completed.',
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
}
