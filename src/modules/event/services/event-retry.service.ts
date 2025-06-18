import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoggerService } from 'src/logger/logger.service';
import { ReliableEventService } from './reliable-event.service';

@Injectable()
export class EventRetryService {
  constructor(
    private readonly reliableEventService: ReliableEventService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Process retry queue every 10 seconds
   */
  @Cron('*/10 * * * * *', {
    name: 'processEventRetryQueue',
  })
  async processRetryQueue(): Promise<void> {
    try {
      const eventsToRetry = await this.reliableEventService.getEventsReadyForRetry();

      if (eventsToRetry.length === 0) {
        return;
      }

      this.logger.info(
        `Processing ${eventsToRetry.length} events from retry queue`,
        {
          action: 'process_retry_queue',
          eventCount: eventsToRetry.length,
        },
      );

      let successCount = 0;
      let failureCount = 0;

      // Process events in parallel but with limited concurrency
      const batchSize = 5;
      for (let i = 0; i < eventsToRetry.length; i += batchSize) {
        const batch = eventsToRetry.slice(i, i + batchSize);
        
        const results = await Promise.allSettled(
          batch.map(event => this.reliableEventService.retryEvent(event))
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failureCount++;
            const event = batch[index];
            this.logger.error(
              `Failed to retry event ${event.id}`,
              {
                eventId: event.id,
                userId: event.userId,
                eventType: event.eventType,
                error: result.status === 'rejected' ? result.reason : 'Unknown error',
              },
            );
          }
        });
      }

      this.logger.info(
        `Retry queue processing completed: ${successCount} successful, ${failureCount} failed`,
        {
          action: 'retry_queue_completed',
          successCount,
          failureCount,
          totalProcessed: eventsToRetry.length,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error processing retry queue: ${error.message}`,
        {
          action: 'process_retry_queue_error',
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }

  /**
   * Clean up expired events every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'cleanupExpiredEvents',
  })
  async cleanupExpiredEvents(): Promise<void> {
    try {
      this.logger.info('Starting cleanup of expired events');

      const cleanedCount = await this.reliableEventService.cleanupExpiredEvents();

      this.logger.info(
        `Expired events cleanup completed: ${cleanedCount} events cleaned`,
        {
          action: 'cleanup_expired_events',
          cleanedCount,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error during expired events cleanup: ${error.message}`,
        {
          action: 'cleanup_expired_events_error',
          error: error.message,
          stack: error.stack,
        },
      );
    }
  }

  /**
   * Generate retry queue statistics every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'retryQueueStats',
  })
  async generateRetryQueueStats(): Promise<void> {
    try {
      // This could be expanded to generate more detailed statistics
      const eventsToRetry = await this.reliableEventService.getEventsReadyForRetry();
      
      if (eventsToRetry.length > 0) {
        // Group by event type for better insights
        const eventTypeStats = eventsToRetry.reduce((acc, event) => {
          acc[event.eventType] = (acc[event.eventType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Group by retry count
        const retryCountStats = eventsToRetry.reduce((acc, event) => {
          const key = `retry_${event.retryCount}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        this.logger.info(
          `Retry queue statistics`,
          {
            action: 'retry_queue_stats',
            totalPendingRetries: eventsToRetry.length,
            eventTypeBreakdown: eventTypeStats,
            retryCountBreakdown: retryCountStats,
          },
        );
      }
    } catch (error) {
      this.logger.error(
        `Error generating retry queue statistics: ${error.message}`,
        {
          action: 'retry_queue_stats_error',
          error: error.message,
        },
      );
    }
  }

  /**
   * Manual method to process retry queue (for testing or manual intervention)
   */
  async processRetryQueueManually(): Promise<{
    processed: number;
    successful: number;
    failed: number;
  }> {
    try {
      const eventsToRetry = await this.reliableEventService.getEventsReadyForRetry();
      
      let successCount = 0;
      let failureCount = 0;

      for (const event of eventsToRetry) {
        try {
          const result = await this.reliableEventService.retryEvent(event);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }
        } catch (error) {
          failureCount++;
          this.logger.error(
            `Manual retry failed for event ${event.id}: ${error.message}`,
          );
        }
      }

      return {
        processed: eventsToRetry.length,
        successful: successCount,
        failed: failureCount,
      };
    } catch (error) {
      this.logger.error(`Manual retry queue processing failed: ${error.message}`);
      throw error;
    }
  }
}
