import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisStreamsEventService } from './redis-streams-event.service';
import { LoggerService } from 'src/logger/logger.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { PendingEvent } from 'src/modules/event/interfaces/reliable-event.interface';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { isEventStillRelevant } from 'src/modules/event/constants/event-trip-status.mapping';

@Injectable()
export class SmartEventService extends RedisStreamsEventService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }

  async sendEventWithLogging(event: PendingEvent): Promise<string> {
    const streamId = await this.logEvent(event);
    await this.trackPendingAck(event, streamId);
    return streamId;
  }

  /**
   * Trip status'ü kontrol ederek event'in hala relevant olup olmadığını kontrol eder
   */
  async isEventRelevant(
    eventType: EventType,
    tripId: string,
    getCurrentTripStatus: (tripId: string) => Promise<TripStatus>,
  ): Promise<boolean> {
    if (!tripId) {
      // Trip ID yoksa (driver location update gibi) her zaman relevant
      return true;
    }

    try {
      const currentTripStatus = await getCurrentTripStatus(tripId);
      return isEventStillRelevant(currentTripStatus, eventType);
    } catch (error: any) {
      this.customLogger.error(
        `Failed to check trip status for ${tripId}: ${error.message}`,
      );
      // Hata durumunda event'i gönder (safe side)
      return true;
    }
  }

  /**
   * Timeout olan ACK'ları kontrol eder ve retry yapar
   */
  async processTimeoutAcks(
    getCurrentTripStatus: (tripId: string) => Promise<TripStatus>,
    retryCallback: (event: any) => Promise<void>,
  ): Promise<void> {
    const timeoutAcks = await this.getTimeoutAcks();

    for (const ackData of timeoutAcks) {
      try {
        // Event hala relevant mi kontrol et
        if (ackData.tripId) {
          const isRelevant = await this.isEventRelevant(
            ackData.eventType,
            ackData.tripId,
            getCurrentTripStatus,
          );

          if (!isRelevant) {
            // Event artık irrelevant, sil
            await this.markEventAsObsolete(ackData);
            continue;
          }
        }

        // Event hala relevant, retry et
        if (ackData.retryCount < 3) {
          await retryCallback(ackData);
        } else {
          // Max retry'a ulaştı, obsolete olarak işaretle
          await this.markEventAsObsolete(ackData, 'max_retries_reached');
        }
      } catch (error: any) {
        this.customLogger.error(
          `Failed to process timeout ACK ${ackData.eventId}: ${error.message}`,
        );
      }
    }
  }

  /**
   * Event'i obsolete olarak işaretler ve temizler
   */
  private async markEventAsObsolete(
    ackData: any,
    reason: string = 'trip_status_progression',
  ): Promise<void> {
    // Pending ACK'ı sil
    const ackKey = RedisKeyGenerator.pendingAcks(ackData.userId);
    await this.client.hdel(ackKey, ackData.eventId);

    // Log for analytics
    this.customLogger.info(`Event marked as obsolete: ${ackData.eventId}`, {
      eventId: ackData.eventId,
      eventType: ackData.eventType,
      tripId: ackData.tripId,
      userId: ackData.userId,
      reason,
    });
  }

  /**
   * User'ın pending event'lerini temizler (trip status değiştiğinde)
   */
  async cleanupObsoleteEventsForTrip(
    tripId: string,
    newTripStatus: TripStatus,
  ): Promise<number> {
    let cleanedCount = 0;

    try {
      // Tüm pending ACK'ları kontrol et
      const keys = await this.client.keys('pending_acks:*');

      for (const key of keys) {
        const userId = key.replace('pending_acks:', '');
        const ackData = await this.client.hgetall(key);

        for (const [eventId, dataStr] of Object.entries(ackData)) {
          try {
            const data = JSON.parse(dataStr);

            // Bu trip'e ait event mi?
            if (data.tripId === tripId) {
              const isRelevant = isEventStillRelevant(
                newTripStatus,
                data.eventType,
              );

              if (!isRelevant) {
                await this.client.hdel(key, eventId);
                cleanedCount++;

                this.customLogger.info(`Cleaned obsolete event: ${eventId}`, {
                  eventId,
                  eventType: data.eventType,
                  tripId,
                  oldStatus: 'unknown',
                  newStatus: newTripStatus,
                });
              }
            }
          } catch (error: any) {
            this.customLogger.error(
              `Failed to parse ACK data for cleanup: ${error.message}`,
            );
          }
        }
      }
    } catch (error: any) {
      this.customLogger.error(
        `Failed to cleanup obsolete events for trip ${tripId}: ${error.message}`,
      );
    }

    if (cleanedCount > 0) {
      this.customLogger.info(
        `Cleaned ${cleanedCount} obsolete events for trip ${tripId}`,
      );
    }

    return cleanedCount;
  }

  /**
   * Event istatistiklerini getirir
   */
  async getEventStats(hours: number = 24): Promise<any> {
    const endTime = Date.now();
    const startTime = endTime - hours * 60 * 60 * 1000;

    // Stream'den son X saatteki event'leri al
    const events = await this.readEvents('-', '+', 1000);

    const stats = {
      totalEvents: 0,
      eventsByType: {} as Record<string, number>,
      pendingAcks: 0,
      timeoutAcks: 0,
      period: `${hours} hours`,
    };

    // Event'leri filtrele ve analiz et
    for (const event of events) {
      const eventTime = new Date(event.timestamp).getTime();

      if (eventTime >= startTime) {
        stats.totalEvents++;
        stats.eventsByType[event.eventType] =
          (stats.eventsByType[event.eventType] || 0) + 1;
      }
    }

    // Pending ACK'ları say
    const keys = await this.client.keys('pending_acks:*');
    for (const key of keys) {
      const ackCount = await this.client.hlen(key);
      stats.pendingAcks += ackCount;
    }

    // Timeout ACK'ları say
    const timeoutAcks = await this.getTimeoutAcks();
    stats.timeoutAcks = timeoutAcks.length;

    return stats;
  }
}
