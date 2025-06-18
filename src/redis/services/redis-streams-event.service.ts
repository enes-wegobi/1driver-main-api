import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { LoggerService } from 'src/logger/logger.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { PendingEvent } from 'src/modules/event/interfaces/reliable-event.interface';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';
import { v4 as uuidv4 } from 'uuid';

export interface StreamEvent {
  streamId: string;
  eventId: string;
  eventType: EventType;
  userId: string;
  userType: UserType;
  tripId?: string;
  data: any;
  timestamp: string;
  requiresAck: boolean;
}

@Injectable()
export class RedisStreamsEventService extends BaseRedisService {
  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Event'i Redis Stream'e log'lar
   */
  @WithErrorHandling('')
  async logEvent(event: PendingEvent): Promise<string> {
    const streamKey = RedisKeyGenerator.eventStream();
    
    // Stream'e event ekle
    const streamId = await this.client.xadd(
      streamKey,
      '*', // Auto-generate ID
      'eventId', event.id,
      'eventType', event.eventType,
      'userId', event.userId,
      'userType', event.userType,
      'tripId', event.tripId || '',
      'data', JSON.stringify(event.data),
      'timestamp', event.timestamp.toISOString(),
      'requiresAck', event.requiresAck.toString(),
      'retryCount', event.retryCount.toString()
    ) as string;

    this.customLogger.info(`Event logged to stream: ${event.eventType}`, {
      eventId: event.id,
      streamId,
      userId: event.userId,
      eventType: event.eventType
    });

    return streamId;
  }

  /**
   * ACK bekleyen event'i track eder
   */
  @WithErrorHandling()
  async trackPendingAck(event: PendingEvent, streamId: string): Promise<void> {
    if (!event.requiresAck) return;

    const ackKey = RedisKeyGenerator.pendingAcks(event.userId);
    const ackData = {
      eventId: event.id,
      streamId: streamId,
      eventType: event.eventType,
      tripId: event.tripId,
      sentAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000),
      retryCount: event.retryCount
    };

    await this.client.hset(ackKey, event.id, JSON.stringify(ackData));
    
    await this.client.expire(ackKey, 300);

    this.customLogger.debug(`Tracking ACK for event: ${event.id}`, {
      eventId: event.id,
      userId: event.userId,
      expiresAt: new Date(ackData.expiresAt).toISOString()
    });
  }

  @WithErrorHandling(false)
  async handleUserAcknowledgment(eventId: string, userId: string): Promise<boolean> {
    const ackKey = RedisKeyGenerator.pendingAcks(userId);
    
    // Pending ACK'ı al
    const ackDataStr = await this.client.hget(ackKey, eventId);
    if (!ackDataStr) {
      this.customLogger.warn(`ACK received for unknown event: ${eventId}`, {
        eventId,
        userId
      });
      return false;
    }

    const ackData = JSON.parse(ackDataStr);
    
    await this.client.hdel(ackKey, eventId);
    
    this.customLogger.info(`Event acknowledged: ${eventId}`, {
      eventId,
      userId,
      eventType: ackData.eventType,
      responseTime: Date.now() - ackData.sentAt
    });

    return true;
  }

  /**
   * User'ın pending ACK'larını getirir
   */
  @WithErrorHandling([])
  async getPendingAcks(userId: string): Promise<any[]> {
    const ackKey = RedisKeyGenerator.pendingAcks(userId);
    const ackData = await this.client.hgetall(ackKey);
    
    const pendingAcks: any[] = [];
    for (const [eventId, dataStr] of Object.entries(ackData)) {
      try {
        const data = JSON.parse(dataStr);
        pendingAcks.push({
          eventId,
          ...data
        });
      } catch (error: any) {
        this.customLogger.error(`Failed to parse ACK data for event ${eventId}: ${error.message}`);
      }
    }

    return pendingAcks;
  }

  /**
   * Timeout olan ACK'ları bulur
   */
  @WithErrorHandling([])
  async getTimeoutAcks(): Promise<any[]> {
    const now = Date.now();
    const timeoutAcks: any[] = [];

    // Tüm user'ların pending ACK'larını kontrol et (bu basit implementasyon)
    // Production'da daha efficient bir yöntem kullanılabilir
    const keys = await this.client.keys('pending_acks:*');
    
    for (const key of keys) {
      const userId = key.replace('pending_acks:', '');
      const ackData = await this.client.hgetall(key);
      
      for (const [eventId, dataStr] of Object.entries(ackData)) {
        try {
          const data = JSON.parse(dataStr);
          if (data.expiresAt <= now) {
            timeoutAcks.push({
              userId,
              eventId,
              ...data
            });
          }
        } catch (error: any) {
          this.customLogger.error(`Failed to parse timeout ACK data: ${error.message}`);
        }
      }
    }

    return timeoutAcks;
  }

  /**
   * Event stream'den event'leri okur
   */
  @WithErrorHandling([])
  async readEvents(
    startId: string = '-',
    endId: string = '+',
    count: number = 100
  ): Promise<StreamEvent[]> {
    const streamKey = RedisKeyGenerator.eventStream();
    
    const events = await this.client.xrange(streamKey, startId, endId, 'COUNT', count);
    
    return events.map(([streamId, fields]) => {
      const eventData = this.parseStreamFields(fields);
      return {
        streamId,
        eventId: eventData.eventId,
        eventType: eventData.eventType as EventType,
        userId: eventData.userId,
        userType: eventData.userType as UserType,
        tripId: eventData.tripId || undefined,
        data: JSON.parse(eventData.data || '{}'),
        timestamp: eventData.timestamp,
        requiresAck: eventData.requiresAck === 'true'
      };
    });
  }

  /**
   * Stream fields'ları parse eder
   */
  private parseStreamFields(fields: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      result[fields[i]] = fields[i + 1];
    }
    return result;
  }

  /**
   * Event ID generate eder
   */
  generateEventId(): string {
    return `evt_${uuidv4().replace(/-/g, '')}`;
  }
}
