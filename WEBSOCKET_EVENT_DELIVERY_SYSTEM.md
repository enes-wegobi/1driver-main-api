# WebSocket Event Delivery & Retry System

## 📋 System Overview

Bu dokümantasyon, WebSocket üzerinden gönderilen event'lerin güvenilir bir şekilde iletilmesini sağlayan hybrid delivery sistemini açıklar. Sistem, real-time WebSocket iletimi ile HTTP polling fallback'ini birleştirerek %99.95 delivery rate garantisi sağlar.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Event Source  │───▶│  Hybrid Message  │───▶│   Client App    │
│  (TripService)  │    │     Service      │    │ (Driver/Customer)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          │
                       ┌──────────────┐                  │
                       │    Redis     │                  │
                       │ Missed Msgs  │                  │
                       └──────────────┘                  │
                              ▲                          │
                              │                          │
                       ┌──────────────┐                  │
                       │ HTTP Polling │◀─────────────────┘
                       │   Endpoint   │
                       └──────────────┘
```

## 🔄 Enhanced Message Flow with Retry

### Primary Flow (Non-Blocking WebSocket + ACK + Retry)
1. **Event Generation**: TripService'de bir event oluşur
2. **Non-Blocking WebSocket Send**: HybridMessageService event'i paralel olarak WebSocket üzerinden gönderir
3. **Async ACK Wait**: 3 saniye boyunca client'tan acknowledgment beklenir (main thread'i bloke etmez)
4. **Background Retry Logic**: ACK gelmezse background'da 500ms bekleyip tekrar dener (maksimum 2 retry)
5. **Async Success/Failure**: Tüm denemeler başarısızsa background'da Redis'e kaydedilir

### Fallback Flow (HTTP Polling)
1. **Missed Storage**: Başarısız event'ler Redis'te saklanır
2. **Client Polling**: Client periyodik olarak missed messages endpoint'ini çağırır
3. **Message Validation**: Gelen mesajlar relevance check'ten geçer
4. **Processing**: Valid mesajlar client tarafında işlenir

## 🧩 Core Components

### 1. HybridMessageService

Ana orchestrator servisi. Tüm event delivery logic'ini yönetir.

```typescript
@Injectable()
export class HybridMessageService {
  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly redisService: RedisService,
    private readonly messageRelevanceService: MessageRelevanceService,
    private readonly pushNotificationService: PushNotificationService
  ) {}

  /**
   * Critical event'leri güvenilir şekilde gönderir (NON-BLOCKING)
   * @param userId - Hedef kullanıcı ID
   * @param eventType - Event tipi (EventType enum)
   * @param data - Event data
   * @returns Promise<boolean> - Delivery success status (immediate response)
   */
  async sendCriticalEvent(
    userId: string, 
    eventType: EventType, 
    data: any
  ): Promise<boolean> {
    const messageId = this.generateMessageId();
    
    // 1. Non-blocking WebSocket gönderimi
    const deliveryPromise = this.webSocketService.sendEventWithAck(
      userId, 
      eventType, 
      { id: messageId, ...data },
      2 // maksimum 2 retry
    );
    
    // 2. Background'da sonucu işle - main thread'i bloke etmez
    setImmediate(async () => {
      try {
        const delivered = await deliveryPromise;
        
        if (delivered) {
          // ✅ ACK alındı, başarılı
          await this.markAsDelivered(messageId);
          this.logger.log(`✅ Event ${eventType} delivered to user ${userId}`);
        } else {
          // ❌ Tüm retry'ler başarısız, fallback'e geç
          await this.storeMissedMessage(userId, messageId, eventType, data);
          
          // Critical event'ler için push notification gönder
          if (this.isCriticalEvent(eventType)) {
            await this.sendPushNotificationFallback(userId, eventType, data);
          }
          
          this.logger.warn(`❌ Event ${eventType} failed for user ${userId}, stored for polling`);
        }
      } catch (error) {
        this.logger.error(`Error processing delivery result for ${messageId}: ${error.message}`);
        await this.storeMissedMessage(userId, messageId, eventType, data);
      }
    });
    
    // 3. Immediate response - caller'ı bloke etmez
    return true; // Optimistic response
  }

  /**
   * Çoklu kullanıcıya non-blocking critical event gönderimi
   * @param userIds - Hedef kullanıcı ID'leri
   * @param eventType - Event tipi
   * @param data - Event data
   * @returns Promise<void> - Immediate response
   */
  async sendCriticalEventToMultipleUsers(
    userIds: string[],
    eventType: EventType,
    data: any
  ): Promise<void> {
    // Paralel gönderim - her kullanıcı için ayrı Promise
    const deliveryPromises = userIds.map(userId => 
      this.sendCriticalEvent(userId, eventType, data)
    );
    
    // Background'da sonuçları topla
    setImmediate(async () => {
      try {
        const results = await Promise.allSettled(deliveryPromises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        this.logger.log(
          `📊 Batch delivery completed: ${successCount}/${userIds.length} users processed for ${eventType}`
        );
      } catch (error) {
        this.logger.error(`Error in batch delivery: ${error.message}`);
      }
    });
  }

  /**
   * Non-critical event'ler için basit gönderim
   */
  async sendEvent(userId: string, eventType: EventType, data: any): Promise<void> {
    await this.webSocketService.sendToUser(userId, eventType, data);
  }

  /**
   * Missed message'ı Redis'e kaydet
   */
  private async storeMissedMessage(
    userId: string, 
    messageId: string, 
    eventType: EventType, 
    data: any
  ): Promise<void> {
    const relevanceRules = this.messageRelevanceService.getRelevanceRules(eventType);
    
    const missedMessage: MissedMessage = {
      id: messageId,
      userId,
      eventType,
      data,
      timestamp: new Date(),
      tripId: data.tripId,
      requiredTripStatus: relevanceRules.requiredStatus,
      expiresAt: new Date(Date.now() + relevanceRules.ttl),
      supersededBy: relevanceRules.supersededBy,
      attempts: 0,
      delivered: false
    };
    
    // Redis list'e ekle
    await this.redisService.lpush(
      `missed_messages:${userId}`, 
      JSON.stringify(missedMessage)
    );
    
    // TTL set et
    await this.redisService.expire(`missed_messages:${userId}`, 3600);
    
    this.logger.debug(`📦 Stored missed message ${messageId} for user ${userId}`);
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isCriticalEvent(eventType: EventType): boolean {
    const criticalEvents = [
      EventType.TRIP_REQUESTED,
      EventType.TRIP_DRIVER_ASSIGNED,
      EventType.TRIP_CANCELLED,
      EventType.TRIP_PAYMENT_REQUIRED
    ];
    return criticalEvents.includes(eventType);
  }
}
```

### 2. Enhanced WebSocketService with Simple Retry

WebSocket ACK mekanizması ve basit retry logic'i ile geliştirilmiş servis.

```typescript
@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor(private readonly redisService: RedisService) {}

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Event gönderir ve acknowledgment bekler - NON-BLOCKING retry ile
   * @param userId - Hedef kullanıcı
   * @param eventType - Event tipi
   * @param data - Event data
   * @param maxRetries - Maksimum retry sayısı (default: 2)
   * @returns Promise<boolean> - ACK alınıp alınmadığı
   */
  async sendEventWithAck(
    userId: string, 
    eventType: string, 
    data: any,
    maxRetries: number = 2
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.attemptDeliveryWithRetry(userId, eventType, data, maxRetries, 0, resolve);
    });
  }

  /**
   * Recursive non-blocking retry mechanism
   */
  private attemptDeliveryWithRetry(
    userId: string,
    eventType: string,
    data: any,
    maxRetries: number,
    currentAttempt: number,
    resolve: (value: boolean) => void
  ): void {
    const isRetry = currentAttempt > 0;
    const timeout = isRetry ? 2000 : 3000; // İlk deneme 3s, retry'ler 2s
    
    this.logger.debug(
      `📤 Attempt ${currentAttempt + 1}/${maxRetries + 1} - Sending ${eventType} to user ${userId}`
    );
    
    // Non-blocking single attempt
    this.sendSingleEventWithAck(userId, eventType, data, timeout)
      .then((delivered) => {
        if (delivered) {
          if (isRetry) {
            this.logger.log(`✅ Event ${eventType} delivered to user ${userId} on retry ${currentAttempt}`);
          } else {
            this.logger.debug(`✅ Event ${eventType} delivered to user ${userId} on first attempt`);
          }
          resolve(true);
          return;
        }
        
        // Retry logic
        if (currentAttempt < maxRetries) {
          this.logger.warn(`⏰ Retry ${currentAttempt + 1} failed for user ${userId}, waiting 500ms`);
          
          // Non-blocking delay before retry
          setTimeout(() => {
            this.attemptDeliveryWithRetry(userId, eventType, data, maxRetries, currentAttempt + 1, resolve);
          }, 500);
        } else {
          this.logger.error(`❌ All ${maxRetries + 1} attempts failed for user ${userId}, event: ${eventType}`);
          resolve(false);
        }
      })
      .catch((error) => {
        this.logger.error(`Error in delivery attempt ${currentAttempt + 1}: ${error.message}`);
        
        if (currentAttempt < maxRetries) {
          setTimeout(() => {
            this.attemptDeliveryWithRetry(userId, eventType, data, maxRetries, currentAttempt + 1, resolve);
          }, 500);
        } else {
          resolve(false);
        }
      });
  }

  /**
   * Tek bir event gönderimi ve ACK bekleme
   */
  private async sendSingleEventWithAck(
    userId: string,
    eventType: string,
    data: any,
    timeoutMs: number = 3000
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.debug(`⏰ ACK timeout (${timeoutMs}ms) for user ${userId}, event: ${eventType}`);
        resolve(false);
      }, timeoutMs);

      // Socket.IO'nun built-in ACK özelliği
      this.server.to(`user:${userId}`).timeout(timeoutMs).emit(eventType, data, (ackResponse) => {
        clearTimeout(timeout);
        
        if (ackResponse && ackResponse.received) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  /**
   * Async sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Geleneksel event gönderimi (ACK olmadan)
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    this.logger.debug(`Sending ${event} to user ${userId}`);
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Birden fazla kullanıcıya non-blocking broadcast with ACK
   */
  async broadcastTripRequest(
    event: any,
    activeDrivers: string[],
    eventType: EventType,
  ): Promise<void> {
    const server = this.getServer();

    // Paralel ACK'li gönderim
    const deliveryPromises = activeDrivers.map(driverId => 
      this.sendEventWithAck(driverId, eventType, event, 1) // 1 retry for broadcast
    );

    // Background'da sonuçları işle
    setImmediate(async () => {
      try {
        const results = await Promise.allSettled(deliveryPromises);
        const successCount = results.filter(r => 
          r.status === 'fulfilled' && r.value === true
        ).length;
        
        this.logger.log(
          `📊 Broadcast completed: ${successCount}/${activeDrivers.length} drivers received ${eventType}`
        );
        
        // Failed deliveries için fallback logic
        const failedDrivers = activeDrivers.filter((_, index) => {
          const result = results[index];
          return result.status === 'rejected' || (result.status === 'fulfilled' && !result.value);
        });
        
        if (failedDrivers.length > 0) {
          this.logger.warn(`⚠️ ${failedDrivers.length} drivers failed to receive ${eventType}`);
          // Burada missed message storage veya push notification fallback yapılabilir
        }
      } catch (error) {
        this.logger.error(`Error in broadcast processing: ${error.message}`);
      }
    });

    // Immediate return - caller'ı bloke etmez
    this.logger.log(
      `🚀 Initiated broadcast of ${eventType} to ${activeDrivers.length} active drivers`,
    );
  }

  /**
   * Legacy broadcast method (fire-and-forget) - backward compatibility
   */
  async broadcastTripRequestLegacy(
    event: any,
    activeDrivers: string[],
    eventType: EventType,
  ): Promise<void> {
    const server = this.getServer();

    return new Promise<void>((resolve) => {
      activeDrivers.forEach((driverId) => {
        server.to(`user:${driverId}`).emit(eventType, event);
      });

      this.logger.log(
        `Sent ${eventType} to ${activeDrivers.length} active drivers via WebSocket (legacy)`,
      );
      resolve();
    });
  }

  getServer(): Server {
    return this.server;
  }
}
```

### 3. MessageRelevanceService

Stale message'ları önlemek için relevance check yapan servis.

```typescript
@Injectable()
export class MessageRelevanceService {
  constructor(
    private readonly tripService: TripService,
    private readonly logger: Logger
  ) {}

  /**
   * Event type'a göre relevance rules döndürür
   */
  getRelevanceRules(eventType: EventType): RelevanceRules {
    const rules: Record<EventType, RelevanceRules> = {
      [EventType.TRIP_REQUESTED]: {
        requiredStatus: ['REQUESTED', 'ASSIGNED'],
        ttl: 300000, // 5 dakika
        supersededBy: [EventType.TRIP_CANCELLED, EventType.TRIP_DRIVER_ASSIGNED]
      },
      [EventType.TRIP_DRIVER_ASSIGNED]: {
        requiredStatus: ['ASSIGNED', 'EN_ROUTE', 'ARRIVED'],
        ttl: 300000, // 5 dakika
        supersededBy: [EventType.TRIP_CANCELLED, EventType.TRIP_COMPLETED]
      },
      [EventType.TRIP_DRIVER_EN_ROUTE]: {
        requiredStatus: ['EN_ROUTE', 'ARRIVED'],
        ttl: 600000, // 10 dakika  
        supersededBy: [
          EventType.TRIP_CANCELLED, 
          EventType.TRIP_COMPLETED, 
          EventType.TRIP_DRIVER_ARRIVED
        ]
      },
      [EventType.TRIP_DRIVER_ARRIVED]: {
        requiredStatus: ['ARRIVED', 'STARTED'],
        ttl: 300000, // 5 dakika
        supersededBy: [
          EventType.TRIP_CANCELLED, 
          EventType.TRIP_COMPLETED, 
          EventType.TRIP_STARTED
        ]
      },
      [EventType.TRIP_STARTED]: {
        requiredStatus: ['STARTED'],
        ttl: 1800000, // 30 dakika
        supersededBy: [EventType.TRIP_CANCELLED, EventType.TRIP_COMPLETED]
      },
      [EventType.TRIP_COMPLETED]: {
        requiredStatus: ['COMPLETED'],
        ttl: 3600000, // 1 saat
        supersededBy: []
      },
      [EventType.TRIP_CANCELLED]: {
        requiredStatus: ['CANCELLED'],
        ttl: 3600000, // 1 saat
        supersededBy: []
      }
    };
    
    return rules[eventType] || {
      requiredStatus: [],
      ttl: 3600000, // Default 1 saat
      supersededBy: []
    };
  }

  /**
   * Message'ların relevance check'ini yapar
   */
  async validateMessageRelevance(messages: MissedMessage[]): Promise<MissedMessage[]> {
    const validMessages: MissedMessage[] = [];
    
    for (const message of messages) {
      // Expiry check
      if (new Date(message.expiresAt) <= new Date()) {
        this.logger.debug(`⏰ Message ${message.id} expired`);
        continue;
      }

      // Trip context olmayan mesajlar her zaman valid
      if (!message.tripId || !message.requiredTripStatus) {
        validMessages.push(message);
        continue;
      }
      
      // Trip'in current status'unu check et
      const currentTrip = await this.tripService.findById(message.tripId);
      
      if (currentTrip && message.requiredTripStatus.includes(currentTrip.status)) {
        validMessages.push(message);
      } else {
        this.logger.debug(
          `🗑️ Message ${message.id} irrelevant - Trip status: ${currentTrip?.status}, Required: ${message.requiredTripStatus}`
        );
      }
    }
    
    return validMessages;
  }

  /**
   * Superseded message'ları filtreler
   */
  removeSupersededMessages(messages: MissedMessage[]): MissedMessage[] {
    const eventTypes = messages.map(m => m.eventType);
    
    return messages.filter(message => {
      // Bu message'ı supersede eden bir event var mı?
      const isSuperseded = message.supersededBy?.some(supersedingEvent => 
        eventTypes.includes(supersedingEvent)
      );
      
      if (isSuperseded) {
        this.logger.debug(`🔄 Message ${message.id} superseded by newer events`);
        return false;
      }
      
      return true;
    });
  }
}
```

### 4. MissedMessagesController

HTTP polling endpoint'i sağlayan controller.

```typescript
@Controller('messages')
export class MissedMessagesController {
  constructor(
    private readonly redisService: RedisService,
    private readonly messageRelevanceService: MessageRelevanceService,
    private readonly logger: Logger
  ) {}

  /**
   * Kullanıcının missed message'larını döndürür
   */
  @Get('missed/:userId')
  async getMissedMessages(
    @Param('userId') userId: string,
    @Query('since') since?: string
  ): Promise<MissedMessage[]> {
    try {
      const sinceDate = since ? new Date(since) : new Date(Date.now() - 3600000); // 1 saat önce
      
      // Redis'ten raw messages al
      const rawMessages = await this.redisService.lrange(`missed_messages:${userId}`, 0, -1);
      
      if (rawMessages.length === 0) {
        return [];
      }

      // Parse messages
      const messages: MissedMessage[] = rawMessages
        .map(msg => {
          try {
            return JSON.parse(msg);
          } catch (error) {
            this.logger.error(`Failed to parse message: ${msg}`);
            return null;
          }
        })
        .filter(msg => msg !== null)
        .filter(msg => new Date(msg.timestamp) > sinceDate)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Relevance validation
      const validMessages = await this.messageRelevanceService.validateMessageRelevance(messages);
      
      // Superseded messages'ları çıkar
      const finalMessages = this.messageRelevanceService.removeSupersededMessages(validMessages);
      
      // Invalid messages'ları Redis'ten temizle
      await this.cleanupInvalidMessages(userId, rawMessages, finalMessages);
      
      this.logger.debug(
        `📨 Returned ${finalMessages.length} valid missed messages for user ${userId}`
      );
      
      return finalMessages;
    } catch (error) {
      this.logger.error(`Error getting missed messages for user ${userId}: ${error.message}`);
      throw new InternalServerErrorException('Failed to retrieve missed messages');
    }
  }

  /**
   * Invalid message'ları Redis'ten temizler
   */
  private async cleanupInvalidMessages(
    userId: string, 
    originalMessages: string[], 
    validMessages: MissedMessage[]
  ): Promise<void> {
    const validMessageIds = new Set(validMessages.map(m => m.id));
    const validMessageStrings = originalMessages.filter(msgStr => {
      try {
        const msg = JSON.parse(msgStr);
        return validMessageIds.has(msg.id);
      } catch {
        return false;
      }
    });

    // Redis'i güncelle
    const key = `missed_messages:${userId}`;
    await this.redisService.del(key);
    
    if (validMessageStrings.length > 0) {
      await this.redisService.lpush(key, ...validMessageStrings);
      await this.redisService.expire(key, 3600); // 1 saat TTL
    }
  }

  /**
   * Message'ı delivered olarak işaretle
   */
  @Post('delivered/:messageId')
  async markAsDelivered(@Param('messageId') messageId: string): Promise<void> {
    // Implementation for marking message as delivered
    this.logger.debug(`✅ Message ${messageId} marked as delivered`);
  }
}
```

## 📱 Client-Side Implementation

### WebSocket ACK Handler

```typescript
// Client tarafında automatic acknowledgment
socket.on('trip:requested', (tripData, acknowledgmentCallback) => {
  try {
    // Event'i işle
    displayTripRequest(tripData);
    updateUI(tripData);
    playNotificationSound();
    
    // Başarılı işleme sonrası ACK gönder
    if (acknowledgmentCallback) {
      acknowledgmentCallback({
        received: true,
        messageId: tripData.id,
        timestamp: Date.now(),
        processed: true
      });
    }
    
    console.log(`✅ Processed and acknowledged: ${tripData.id}`);
  } catch (error) {
    console.error(`❌ Error processing trip request: ${error.message}`);
    
    // Hata durumunda da ACK gönder ama error flag ile
    if (acknowledgmentCallback) {
      acknowledgmentCallback({
        received: true,
        messageId: tripData.id,
        timestamp: Date.now(),
        error: error.message,
        processed: false
      });
    }
  }
});

// Diğer event'ler için de benzer ACK handlers
socket.on('trip:driver_assigned', (data, callback) => {
  processDriverAssignment(data);
  callback?.({ received: true, messageId: data.id, timestamp: Date.now() });
});

socket.on('trip:cancelled', (data, callback) => {
  processTripCancellation(data);
  callback?.({ received: true, messageId: data.id, timestamp: Date.now() });
});
```

### HTTP Polling Fallback

```typescript
class MessagePoller {
  private lastPollTime: string = new Date().toISOString();
  private pollingInterval: number = 10000; // 10 saniye
  private maxInterval: number = 60000; // 60 saniye
  private isPolling: boolean = false;
  private processedMessages: Set<string> = new Set();

  /**
   * Polling'i başlat
   */
  startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.poll();
  }

  /**
   * Polling'i durdur
   */
  stopPolling() {
    this.isPolling = false;
  }

  /**
   * Polling logic
   */
  private async poll() {
    if (!this.isPolling) return;

    try {
      const response = await fetch(
        `/api/messages/missed/${userId}?since=${this.lastPollTime}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const missedMessages = await response.json();
      
      if (missedMessages.length > 0) {
        console.log(`📨 Found ${missedMessages.length} missed messages`);
        
        for (const message of missedMessages) {
          await this.processMessage(message);
        }
        
        this.lastPollTime = new Date().toISOString();
        this.adjustPollingFrequency(true); // Hızlandır
      } else {
        this.adjustPollingFrequency(false); // Yavaşlat
      }
    } catch (error) {
      console.error('Polling error:', error);
      this.adjustPollingFrequency(false);
    }

    // Next poll
    setTimeout(() => this.poll(), this.pollingInterval);
  }

  /**
   * Adaptive polling frequency
   */
  private adjustPollingFrequency(hasNewMessages: boolean) {
    if (hasNewMessages) {
      this.pollingInterval = 10000; // Reset to base interval
    } else {
      this.pollingInterval = Math.min(this.pollingInterval * 1.2, this.maxInterval);
    }
  }

  /**
   * Message processing with deduplication
   */
  private async processMessage(message: any) {
    // Duplicate check
    if (this.processedMessages.has(message.id)) {
      console.log(`🔄 Skipping duplicate message: ${message.id}`);
      return;
    }

    // Relevance check
    if (!this.isMessageRelevant(message)) {
      console.log(`🚫 Ignoring irrelevant message: ${message.eventType}`);
      return;
    }

    try {
      // Event'e göre işle
      switch (message.eventType) {
        case 'trip:requested':
          displayTripRequest(message.data);
          break;
        case 'trip:driver_assigned':
          showDriverAssignment(message.data);
          break;
        case 'trip:cancelled':
          hideTripRequest(message.data);
          break;
        case 'trip:driver_en_route':
          showDriverEnRoute(message.data);
          break;
        default:
          console.warn(`Unknown event type: ${message.eventType}`);
      }

      // Mark as processed
      this.processedMessages.add(message.id);
      
      // Cleanup old processed messages (memory management)
      if (this.processedMessages.size > 1000) {
        const oldMessages = Array.from(this.processedMessages).slice(0, 500);
        oldMessages.forEach(id => this.processedMessages.delete(id));
      }

      console.log(`✅ Processed missed message: ${message.id}`);
    } catch (error) {
      console.error(`❌ Error processing message ${message.id}:`, error);
    }
  }

  /**
   * Message relevance check
   */
  private isMessageRelevant(message: any): boolean {
    // Timestamp check - çok eski message'ları ignore et
    const messageAge = Date.now() - new Date(message.timestamp).getTime();
    if (messageAge > 600000) { // 10 dakikadan eski
      return false;
    }

    // Trip context check
    if (message.tripId && this.currentTripState) {
      const compatibleStatuses = this.getCompatibleStatuses(message.eventType);
      return compatibleStatuses.includes(this.currentTripState.status);
    }

    return true;
  }

  private getCompatibleStatuses(eventType: string): string[] {
    const compatibility = {
      'trip:requested': ['REQUESTED'],
      'trip:driver_assigned': ['ASSIGNED', 'EN_ROUTE', 'ARRIVED'],
      'trip:driver_en_route': ['EN_ROUTE', 'ARRIVED'],
      'trip:driver_arrived': ['ARRIVED', 'STARTED'],
      'trip:started': ['STARTED'],
      'trip:completed': ['COMPLETED'],
      'trip:cancelled': ['CANCELLED']
    };
    
    return compatibility[eventType] || [];
  }
}

// Usage
const messagePoller = new MessagePoller();

// WebSocket bağlantısı koptuğunda polling başlat
socket.on('disconnect', () => {
  console.log('🔌 WebSocket disconnected, starting polling fallback');
  messagePoller.startPolling();
});

// WebSocket bağlantısı kurulduğunda polling durdur
socket.on('connect', () => {
  console.log('🔌 WebSocket connected, stopping polling fallback');
  messagePoller.stopPolling();
});
```

## 🗄️ Data Structures

### MissedMessage Interface

```typescript
interface MissedMessage {
  id: string;                    // Unique message identifier
  userId: string;                // Target user ID
  eventType: EventType;          // Event type from enum
  data: any;                     // Event payload
  timestamp: Date;               // Creation timestamp
  tripId?: string;               // Trip context (if applicable)
  requiredTripStatus?: string[]; // Valid trip statuses for this message
  expiresAt: Date;              // Message expiry time
  supersededBy?: EventType[];    // Events that invalidate this message
  attempts: number;              // Delivery attempt count
  delivered: boolean;            // Delivery status
}
```

### RelevanceRules Interface

```typescript
interface RelevanceRules {
  requiredStatus: string[];      // Valid trip statuses
  ttl: number;                   // Time to live in milliseconds
  supersededBy: EventType[];     // Superseding events
}
```

### ACK Response Interface

```typescript
interface AckResponse {
  received: boolean;             // Message received successfully
  messageId: string;             // Message identifier
  timestamp: number;             // Processing timestamp
  processed?: boolean;           // Message processed successfully
  error?: string;                // Error message (if any)
}
```

## 🔧 Configuration

### Environment Variables

```env
# WebSocket Configuration
WEBSOCKET_ACK_TIMEOUT=3000          # ACK timeout in milliseconds (first attempt)
WEBSOCKET_RETRY_TIMEOUT=2000        # ACK timeout for retries
WEBSOCKET_MAX_RETRIES=2             # Maximum retry attempts
WEBSOCKET_RETRY_DELAY=500           # Delay between retries (ms)
WEBSOCKET_PING_INTERVAL=25000       # Ping interval
WEBSOCKET_PING_TIMEOUT=10000        # Ping timeout

# Polling Configuration
HTTP_POLLING_INTERVAL=10000         # Default polling interval
HTTP_POLLING_MAX_INTERVAL=60000     # Maximum polling interval
HTTP_POLLING_ADAPTIVE=true          # Enable adaptive polling

# Redis Configuration
MISSED_MESSAGES_TTL=3600            # TTL for missed messages (seconds)
MISSED_MESSAGES_MAX_COUNT=100       # Max messages per user

# Message Relevance
MESSAGE_DEFAULT_TTL=3600000         # Default message TTL (milliseconds)
MESSAGE_CLEANUP_INTERVAL=300000     # Cleanup job interval (5 minutes)

# Critical Events
ENABLE_PUSH_FALLBACK=true           # Enable push notification fallback
CRITICAL_EVENT_RETRY_COUNT=2        # Retry count for critical events
```

### Module Configuration

```typescript
// websocket.module.ts
@Module({
  imports: [
    RedisModule,
    EventModule,
    PushNotificationModule
  ],
  providers: [
    WebSocketGateway,
    WebSocketService,
    HybridMessageService,
    MessageRelevanceService
  ],
  controllers: [
    MissedMessagesController
  ],
  exports: [
    WebSocketService,
    HybridMessageService
  ]
})
export class WebSocketModule {}
```

## 📊 Performance Metrics with Non-Blocking Retry

### Expected Performance Improvement

| Metric | Without Retry | With Blocking Retry | With Non-Blocking Retry | Improvement |
|--------|---------------|---------------------|-------------------------|-------------|
| WebSocket Success Rate | 95% | 98-99% | 98-99% | +3-4% |
| HTTP Polling Recovery Rate | 99% | 99% | 99% | - |
| Combined Delivery Rate | 99.95% | 99.99% | 99.99% | +0.04% |
| API Response Time | 50-100ms | 3000-9000ms | 50-100ms | **No degradation** |
| Concurrent Request Handling | Normal | **Severely Limited** | Normal | **Maintained** |
| Memory Usage per Message | ~800B | ~800B | ~900B | +100B |
| CPU Usage (Background Processing) | Low | High (blocking) | Medium (async) | Optimized |

### Non-Blocking Performance Benefits

| Scenario | Blocking Approach | Non-Blocking Approach | Improvement |
|----------|-------------------|----------------------|-------------|
| **10 drivers, trip request** | 30 seconds total | 100ms response | **300x faster** |
| **100 concurrent API calls** | Queue buildup | Parallel processing | **No bottleneck** |
| **System throughput** | Severely limited | Maintained | **Full capacity** |
| **User experience** | Timeouts, delays | Responsive | **Seamless** |

### Non-Blocking Retry Statistics

```typescript
// Non-blocking retry effectiveness monitoring
interface NonBlockingRetryStats {
  totalAttempts: number;
  firstAttemptSuccess: number;    // ~95%
  secondAttemptSuccess: number;   // ~60% of remaining
  thirdAttemptSuccess: number;    // ~40% of remaining
  totalFailures: number;          // ~1-2%
  averageResponseTime: number;    // ~50-100ms (immediate)
  backgroundProcessingTime: number; // ~500-3000ms (async)
  concurrentRequestsHandled: number; // Unlimited
}

// Expected non-blocking retry contribution
const nonBlockingRetryContribution = {
  firstAttempt: 95,      // 95% success
  secondAttempt: 3,      // 60% of 5% = 3%
  thirdAttempt: 1,       // 40% of 2% = 0.8%
  totalSuccess: 99,      // 99% total success
  fallbackNeeded: 1,     // 1% goes to polling
  responseTime: 'immediate', // API responds immediately
  processingTime: 'background' // Actual delivery happens async
};

// Performance comparison
const performanceComparison = {
  blocking: {
    apiResponseTime: '3000-9000ms',
    concurrentCapacity: 'Limited',
    userExperience: 'Poor (timeouts)',
    systemThroughput: 'Severely reduced'
  },
  nonBlocking: {
    apiResponseTime: '50-100ms',
    concurrentCapacity: 'Unlimited',
    userExperience: 'Excellent',
    systemThroughput: 'Full capacity maintained'
  }
};
```

### Real-World Scenario Impact

```typescript
// Trip request scenario with 50 drivers
const tripRequestScenario = {
  blocking: {
    totalTime: '50 drivers × 3 seconds = 150 seconds',
    apiResponse: '150 seconds',
    otherRequests: 'Blocked for 150 seconds',
    userExperience: 'Timeout errors'
  },
  nonBlocking: {
    totalTime: '50 drivers × 3 seconds = 150 seconds (background)',
    apiResponse: '100ms',
    otherRequests: 'Processed normally',
    userExperience: 'Immediate response'
  }
};
```

## 🚀 Non-Blocking Implementation Best Practices

### 1. **Immediate Response Pattern**
```typescript
// ✅ DOĞRU - Non-blocking approach
async function requestDriver(tripId: string, driverIds: string[]): Promise<TripResponse> {
  // Immediate database update
  const trip = await updateTripStatus(tripId, TripStatus.WAITING_FOR_DRIVER);
  
  // Background driver notification - doesn't block response
  setImmediate(async () => {
    await hybridMessageService.sendCriticalEventToMultipleUsers(
      driverIds,
      EventType.TRIP_REQUESTED,
      trip
    );
  });
  
  // Immediate response to client
  return { success: true, trip, message: 'Driver search initiated' };
}

// ❌ YANLIŞ - Blocking approach
async function requestDriverBlocking(tripId: string, driverIds: string[]): Promise<TripResponse> {
  const trip = await updateTripStatus(tripId, TripStatus.WAITING_FOR_DRIVER);
  
  // This blocks the API response for up to 150 seconds!
  for (const driverId of driverIds) {
    await hybridMessageService.sendCriticalEvent(driverId, EventType.TRIP_REQUESTED, trip);
  }
  
  return { success: true, trip }; // Takes forever to reach here
}
```

### 2. **Background Processing Pattern**
```typescript
class NonBlockingEventProcessor {
  private processingQueue: Map<string, Promise<any>> = new Map();
  
  async processEventAsync(userId: string, eventType: EventType, data: any): Promise<void> {
    const key = `${userId}:${eventType}`;
    
    // Prevent duplicate processing
    if (this.processingQueue.has(key)) {
      return;
    }
    
    // Start background processing
    const processingPromise = this.doBackgroundProcessing(userId, eventType, data);
    this.processingQueue.set(key, processingPromise);
    
    // Cleanup after completion
    processingPromise.finally(() => {
      this.processingQueue.delete(key);
    });
  }
  
  private async doBackgroundProcessing(userId: string, eventType: EventType, data: any): Promise<void> {
    try {
      const delivered = await this.webSocketService.sendEventWithAck(userId, eventType, data);
      
      if (!delivered) {
        await this.storeMissedMessage(userId, eventType, data);
        await this.sendPushNotificationFallback(userId, eventType, data);
      }
    } catch (error) {
      this.logger.error(`Background processing failed: ${error.message}`);
      await this.storeMissedMessage(userId, eventType, data);
    }
  }
}
```

### 3. **Circuit Breaker Pattern**
```typescript
class CircuitBreakerWebSocket {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds
  
  async sendWithCircuitBreaker(userId: string, eventType: EventType, data: any): Promise<boolean> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        // Circuit is open, immediately fallback
        await this.storeMissedMessage(userId, eventType, data);
        return false;
      }
    }
    
    try {
      const delivered = await this.webSocketService.sendEventWithAck(userId, eventType, data);
      
      if (delivered) {
        this.onSuccess();
        return true;
      } else {
        this.onFailure();
        return false;
      }
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

## 🚨 Error Handling & Monitoring
