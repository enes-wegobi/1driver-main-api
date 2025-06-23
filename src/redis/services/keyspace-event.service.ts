import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { LoggerService } from 'src/logger/logger.service';
import { DriverStatusService } from './driver-status.service';
import { CustomerStatusService } from './customer-status.service';
import { UserType } from 'src/common/user-type.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { RedisKeyGenerator } from '../redis-key.generator';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { isEventStillRelevant } from 'src/modules/event/constants/event-trip-status.mapping';
import Redis from 'ioredis';
import { EventTTLConfigUtil } from 'src/modules/event/utils/event-ttl-config.util';

export interface ExpiredAckData {
  eventId: string;
  userId: string;
  eventType: EventType;
  tripId?: string;
  userType: UserType;
  retryCount: number;
  timestamp: Date;
  data?: any;
}

@Injectable()
export class KeyspaceEventService
  extends BaseRedisService
  implements OnModuleInit, OnModuleDestroy
{
  private subscriber: Redis;

  constructor(
    configService: ConfigService,
    protected readonly logger: LoggerService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
  ) {
    super(configService, logger);
  }

  async onModuleInit(): Promise<void> {
    await this.initializeKeyspaceListener();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.disconnect();
    }
  }

  private async initializeKeyspaceListener(): Promise<void> {
    try {
      this.subscriber = this.client.duplicate();

      // Subscribe to expired key events
      await this.subscriber.psubscribe('__keyevent@0__:expired');

      this.subscriber.on('pmessage', async (pattern, channel, expiredKey) => {
        await this.handleExpiredKey(expiredKey);
      });

      this.subscriber.on('error', (error) => {
        this.logger.error('Keyspace event subscriber error:', error);
      });

      this.logger.info('Keyspace event listener initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize keyspace event listener:', error);
      // Don't throw error, let the application continue with fallback mechanisms
    }
  }

  private async handleExpiredKey(expiredKey: string): Promise<void> {
    // Only handle event TTL keys
    if (!expiredKey.startsWith('event_ttl:')) {
      return;
    }

    try {
      // Parse key format: event_ttl:userId:eventId
      const keyParts = expiredKey.split(':');
      if (keyParts.length !== 3) {
        this.logger.warn(`Invalid TTL key format: ${expiredKey}`);
        return;
      }

      const [, userId, eventId] = keyParts;

      await this.processExpiredEvent(userId, eventId);
    } catch (error) {
      this.logger.error(`Error processing expired key ${expiredKey}:`, error);
    }
  }

  private async processExpiredEvent(
    userId: string,
    eventId: string,
  ): Promise<void> {
    // Get the event data from the backup key (since TTL key is already expired)
    const backupKey = RedisKeyGenerator.eventBackup(userId, eventId);
    const backupDataStr = await this.client.get(backupKey);

    if (!backupDataStr) {
      this.logger.warn(`Backup data not found for expired event ${eventId}`, {
        eventId,
        userId,
        backupKey,
      });
      return;
    }

    let ackData: ExpiredAckData;
    try {
      ackData = JSON.parse(backupDataStr);
    } catch (error) {
      this.logger.error(
        `Failed to parse backup data for event ${eventId}:`,
        error,
      );
      return;
    }

    const eventType = ackData.eventType as EventType;
    const maxRetries = EventTTLConfigUtil.getMaxRetries(eventType);
    const currentRetryCount = ackData.retryCount || 0;

    // Check if we've exceeded max retries
    if (currentRetryCount >= maxRetries) {
      this.logger.info(
        `Event ${eventId} reached max retries (${maxRetries}), marking as obsolete`,
      );
      await this.cleanupBackupKey(userId, eventId);
      return;
    }

    // Check if event is still relevant (trip status check)
    if (ackData.tripId) {
      const isRelevant = await this.isEventStillRelevant(
        eventType,
        ackData.tripId,
      );
      if (!isRelevant) {
        this.logger.info(
          `Event ${eventId} no longer relevant due to trip status progression`,
        );
        await this.cleanupBackupKey(userId, eventId);
        return;
      }
    }

    // Check if user is ready to receive the retry
    const shouldRetry = await this.shouldRetryForUser(
      userId,
      ackData.userType,
      eventType,
      ackData,
    );
    if (!shouldRetry) {
      this.logger.info(
        `User ${userId} not ready for retry, skipping event ${eventId}`,
      );
      return;
    }

    // Perform the retry
    await this.retryExpiredEvent(ackData, currentRetryCount + 1);
  }

  private async shouldRetryForUser(
    userId: string,
    userType: UserType,
    eventType: EventType,
    ackData?: ExpiredAckData,
  ): Promise<boolean> {
    try {
      /*
      // TRIP_REQUESTED için özel driver processing kontrolü
      if (eventType === EventType.TRIP_REQUESTED && userType === UserType.DRIVER) {
        const driverProcessingCheck = await this.checkDriverProcessingState(userId, ackData);
        if (!driverProcessingCheck) {
          this.logger.info(
            `Driver ${userId} processing state check failed, skipping retry for event ${ackData?.eventId}`,
          );
          return false;
        }
      }
*/
      const isCritical = EventTTLConfigUtil.isCritical(eventType);

      if (isCritical) {
        // Critical events: More lenient, retry even if user is in background
        return await this.isUserReadyForCriticalEvent(userId, userType);
      } else {
        // Normal events: Only retry if user is in foreground
        return await this.isUserInForeground(userId, userType);
      }
    } catch (error) {
      this.logger.error(`Error checking user retry readiness:`, error);
      // On error, be conservative and allow retry
      return true;
    }
  }

  private async isUserReadyForCriticalEvent(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    try {
      if (userType === UserType.DRIVER) {
        const appState =
          await this.driverStatusService.getDriverAppState(userId);
        // For critical events, retry unless user is completely inactive
        return !appState;
      } else {
        const appState =
          await this.customerStatusService.getCustomerAppState(userId);
        return !appState;
      }
    } catch (error) {
      this.logger.error(
        `Error checking critical event readiness for user ${userId}:`,
        error,
      );
      return true; // Default to allowing retry on error
    }
  }

  private async isUserInForeground(
    userId: string,
    userType: UserType,
  ): Promise<boolean> {
    try {
      if (userType === UserType.DRIVER) {
        const appState =
          await this.driverStatusService.getDriverAppState(userId);
        return appState === AppState.FOREGROUND;
      } else {
        const appState =
          await this.customerStatusService.getCustomerAppState(userId);
        return appState === AppState.FOREGROUND;
      }
    } catch (error) {
      this.logger.error(
        `Error checking foreground status for user ${userId}:`,
        error,
      );
      return false; // Default to not retrying on error for normal events
    }
  }

  private async isEventStillRelevant(
    eventType: EventType,
    tripId: string,
    ackData?: ExpiredAckData,
  ): Promise<boolean> {
    try {
      // Use callback pattern to avoid circular dependency
      if (this.getTripStatusCallback) {
        const currentTripStatus = await this.getTripStatusCallback(tripId);

        // Use the existing mapping function to check if event is still relevant
        const isRelevant = isEventStillRelevant(currentTripStatus, eventType);
/*
        // TRIP_REQUESTED için ek detaylı kontroller
        if (eventType === EventType.TRIP_REQUESTED && ackData) {
          const enhancedRelevance = await this.checkTripRequestRelevance(
            tripId,
            currentTripStatus,
            ackData,
          );
          
          this.logger.debug(`Enhanced relevance check for TRIP_REQUESTED`, {
            tripId,
            currentTripStatus,
            basicRelevance: isRelevant,
            enhancedRelevance,
            driverId: ackData.userId,
          });
          
          return isRelevant && enhancedRelevance;
        }
*/
        this.logger.debug(`Event relevance check for ${eventType}`, {
          tripId,
          currentTripStatus,
          eventType,
          isRelevant,
        });

        return isRelevant;
      } else {
        this.logger.warn(
          `No trip status callback set, assuming event is relevant`,
        );
        return true; // Default to relevant if no callback
      }
    } catch (error) {
      this.logger.error(
        `Error checking event relevance for trip ${tripId}:`,
        error,
      );
      return true; // Default to relevant on error (safe side)
    }
  }

  private async retryExpiredEvent(
    ackData: ExpiredAckData,
    newRetryCount: number,
  ): Promise<void> {
    try {
      // Update retry count
      const updatedAckData = {
        ...ackData,
        retryCount: newRetryCount,
      };

      this.logger.info(`Triggering retry for event ${ackData.eventId}`, {
        eventId: ackData.eventId,
        userId: ackData.userId,
        eventType: ackData.eventType,
        retryCount: newRetryCount,
        priority: EventTTLConfigUtil.getPriority(ackData.eventType),
      });

      // Use callback pattern instead of direct dependency
      if (this.retryCallback) {
        await this.retryCallback(updatedAckData);
      } else {
        this.logger.warn(`No retry callback set for event ${ackData.eventId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to retry expired event ${ackData.eventId}:`,
        error,
      );
    }
  }

  /**
   * Create TTL key for tracking ACK timeout
   */
  async createTTLKey(eventData: ExpiredAckData): Promise<void> {
    try {
      const ttl = EventTTLConfigUtil.getTTL(
        eventData.eventType,
        eventData.retryCount,
      );
      const ttlKey = RedisKeyGenerator.eventTtl(
        eventData.userId,
        eventData.eventId,
      );
      const backupKey = RedisKeyGenerator.eventBackup(
        eventData.userId,
        eventData.eventId,
      );

      // TTL key: Just a trigger (minimal data)
      await this.client.setex(ttlKey, ttl, 'trigger');

      // Backup key: Store actual event data with extra 5 minutes for cleanup
      await this.client.setex(backupKey, ttl + 300, JSON.stringify(eventData));

      this.logger.debug(
        `Created TTL and backup keys for event ${eventData.eventId}`,
        {
          eventId: eventData.eventId,
          ttl,
          backupTtl: ttl + 300,
        },
      );
    } catch (error) {
      this.logger.error(`Failed to create TTL key:`, error);
    }
  }

  /**
   * Remove TTL key when ACK is received
   */
  async removeTTLKey(userId: string, eventId: string): Promise<void> {
    try {
      const ttlKey = RedisKeyGenerator.eventTtl(userId, eventId);
      const backupKey = RedisKeyGenerator.eventBackup(userId, eventId);

      // Remove both TTL and backup keys
      const results = await this.client.del(ttlKey, backupKey);

      if (results > 0) {
        this.logger.debug(
          `Removed TTL and backup keys for acknowledged event ${eventId}`,
          {
            eventId,
            userId,
            keysRemoved: results,
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to remove TTL and backup keys:`, error);
    }
  }

  /**
   * Clean up backup key when event is no longer needed
   */
  private async cleanupBackupKey(
    userId: string,
    eventId: string,
  ): Promise<void> {
    try {
      const backupKey = RedisKeyGenerator.eventBackup(userId, eventId);
      const result = await this.client.del(backupKey);

      if (result > 0) {
        this.logger.debug(
          `Cleaned up backup key for obsolete event ${eventId}`,
          {
            eventId,
            userId,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup backup key for event ${eventId}:`,
        error,
      );
    }
  }

  /**
   * Check driver processing state for TRIP_REQUESTED events
   */
  private async checkDriverProcessingState(
    driverId: string,
    ackData?: ExpiredAckData,
  ): Promise<boolean> {
    try {
      // Use callback pattern to avoid circular dependency
      if (this.driverProcessingCallback) {
        const isProcessing = await this.driverProcessingCallback.isDriverProcessingTrip(driverId);
        const processingTrip = await this.driverProcessingCallback.getDriverProcessingTrip(driverId);
        
        // Eğer driver başka bir trip işliyorsa retry yapma
        if (isProcessing && processingTrip !== ackData?.tripId) {
          this.logger.debug(
            `Driver ${driverId} is processing different trip ${processingTrip}, expected ${ackData?.tripId}`,
          );
          return false;
        }
        
        // Eğer driver hiçbir trip işlemiyorsa da retry yapma (timeout olmuş olabilir)
        if (!isProcessing) {
          this.logger.debug(
            `Driver ${driverId} is not processing any trip, may have timed out`,
          );
          return false;
        }
        
        return true;
      } else {
        this.logger.warn(
          `No driver processing callback set, allowing retry for driver ${driverId}`,
        );
        return true; // Default to allowing retry if no callback
      }
    } catch (error) {
      this.logger.error(
        `Error checking driver processing state for ${driverId}:`,
        error,
      );
      return true; // Default to allowing retry on error
    }
  }

  /**
   * Enhanced relevance check for TRIP_REQUESTED events
   */
  private async checkTripRequestRelevance(
    tripId: string,
    currentTripStatus: TripStatus,
    ackData: ExpiredAckData,
  ): Promise<boolean> {
    try {
      // 1. Trip hala WAITING_FOR_DRIVER durumunda mı?
      if (currentTripStatus !== TripStatus.WAITING_FOR_DRIVER) {
        this.logger.debug(
          `Trip ${tripId} is no longer waiting for driver, current status: ${currentTripStatus}`,
        );
        return false;
      }

      // 2. Trip details callback kullanarak detaylı kontrol
      if (this.getTripDetailsCallback) {
        const tripDetails = await this.getTripDetailsCallback(tripId);
        
        if (!tripDetails) {
          this.logger.debug(`Trip ${tripId} details not found`);
          return false;
        }

        // 3. Driver hala called list'te mi?
        if (!tripDetails.calledDriverIds?.includes(ackData.userId)) {
          this.logger.debug(
            `Driver ${ackData.userId} is no longer in called drivers list for trip ${tripId}`,
          );
          return false;
        }

        // 4. Driver rejected list'te mi?
        if (tripDetails.rejectedDriverIds?.includes(ackData.userId)) {
          this.logger.debug(
            `Driver ${ackData.userId} is in rejected drivers list for trip ${tripId}`,
          );
          return false;
        }

        // 5. Trip zaten başka bir driver tarafından kabul edilmiş mi?
        if (tripDetails.driver && tripDetails.driver.id !== ackData.userId) {
          this.logger.debug(
            `Trip ${tripId} already accepted by driver ${tripDetails.driver.id}, not ${ackData.userId}`,
          );
          return false;
        }

        return true;
      } else {
        this.logger.warn(
          `No trip details callback set, using basic relevance check for trip ${tripId}`,
        );
        return true; // Default to relevant if no callback
      }
    } catch (error) {
      this.logger.error(
        `Error in enhanced trip request relevance check for trip ${tripId}:`,
        error,
      );
      return true; // Default to relevant on error (safe side)
    }
  }

  /**
   * Callback to get trip status (to avoid circular dependency)
   */
  getTripStatusCallback?: (tripId: string) => Promise<TripStatus>;

  /**
   * Callback to get trip details (to avoid circular dependency)
   */
  private getTripDetailsCallback?: (tripId: string) => Promise<{
    calledDriverIds?: string[];
    rejectedDriverIds?: string[];
    driver?: { id: string };
  } | null>;

  /**
   * Callback to retry events (to avoid circular dependency)
   */
  private retryCallback?: (ackData: ExpiredAckData) => Promise<void>;

  /**
   * Callback to check driver processing state (to avoid circular dependency)
   */
  private driverProcessingCallback?: {
    isDriverProcessingTrip: (driverId: string) => Promise<boolean>;
    getDriverProcessingTrip: (driverId: string) => Promise<string | null>;
  };

  /**
   * Set the trip status callback
   */
  setTripStatusCallback(
    callback: (tripId: string) => Promise<TripStatus>,
  ): void {
    this.getTripStatusCallback = callback;
  }

  /**
   * Set the retry callback
   */
  setRetryCallback(callback: (ackData: ExpiredAckData) => Promise<void>): void {
    this.retryCallback = callback;
  }

  /**
   * Set the trip details callback
   */
  setTripDetailsCallback(callback: (tripId: string) => Promise<{
    calledDriverIds?: string[];
    rejectedDriverIds?: string[];
    driver?: { id: string };
  } | null>): void {
    this.getTripDetailsCallback = callback;
  }

  /**
   * Set the driver processing callback
   */
  setDriverProcessingCallback(callback: {
    isDriverProcessingTrip: (driverId: string) => Promise<boolean>;
    getDriverProcessingTrip: (driverId: string) => Promise<string | null>;
  }): void {
    this.driverProcessingCallback = callback;
  }
}
