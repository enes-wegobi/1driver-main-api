import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from 'src/logger/logger.service';
import { SmartEventService } from 'src/redis/services/smart-event.service';
import { Event2Service } from '../event_v2.service';
import { TripService } from 'src/modules/trip/services/trip.service';
import { TripStatus } from 'src/common/enums/trip-status.enum';

@Injectable()
export class AckTimeoutService {
  constructor(
    private readonly smartEventService: SmartEventService,
    private readonly event2Service: Event2Service,
    private readonly tripService: TripService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Her 30 saniyede bir timeout olan ACK'ları kontrol eder
   */
  @Cron('*/30 * * * * *')
  async checkAckTimeouts(): Promise<void> {
    try {
      await this.smartEventService.processTimeoutAcks(
        this.getCurrentTripStatus.bind(this),
        this.retryEvent.bind(this),
      );
    } catch (error: any) {
      this.logger.error(`Error checking ACK timeouts: ${error.message}`);
    }
  }

  /**
   * Trip status'ü MongoDB'dan alır
   */
  private async getCurrentTripStatus(tripId: string): Promise<TripStatus> {
    try {
      const trip = await this.tripService.findById(tripId);
      return trip?.status || TripStatus.CANCELLED;
    } catch (error: any) {
      this.logger.error(`Failed to get trip status for ${tripId}: ${error.message}`);
      return TripStatus.CANCELLED;
    }
  }

  /**
   * Event'i retry eder
   */
  private async retryEvent(ackData: any): Promise<void> {
    try {
      ackData.retryCount = (ackData.retryCount || 0) + 1;
      
      await this.event2Service.sendToUser(
        ackData.userId,
        ackData.eventType,
        ackData.data || {},
        ackData.userType,
        ackData.tripId,
      );

      this.logger.info(`Event ${ackData.eventId} retried (attempt ${ackData.retryCount})`, {
        eventId: ackData.eventId,
        userId: ackData.userId,
        eventType: ackData.eventType,
        retryCount: ackData.retryCount
      });

    } catch (error: any) {
      this.logger.error(`Failed to retry event ${ackData.eventId}: ${error.message}`);
    }
  }

  /**
   * Trip status değiştiğinde obsolete event'leri temizler
   */
  async onTripStatusChanged(tripId: string, newStatus: TripStatus): Promise<void> {
    try {
      const cleanedCount = await this.smartEventService.cleanupObsoleteEventsForTrip(
        tripId,
        newStatus
      );

      if (cleanedCount > 0) {
        this.logger.info(`Cleaned ${cleanedCount} obsolete events for trip ${tripId} (new status: ${newStatus})`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to cleanup obsolete events for trip ${tripId}: ${error.message}`);
    }
  }

  /**
   * Event istatistiklerini getirir
   */
  async getEventStats(hours: number = 24): Promise<any> {
    try {
      return await this.smartEventService.getEventStats(hours);
    } catch (error: any) {
      this.logger.error(`Failed to get event stats: ${error.message}`);
      return {
        totalEvents: 0,
        eventsByType: {},
        pendingAcks: 0,
        timeoutAcks: 0,
        period: `${hours} hours`,
        error: error.message
      };
    }
  }
}
