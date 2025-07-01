import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, JobsOptions, JobType } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import {
  TripRequestJob,
  TripTimeoutJob,
  QueueJobOptions,
} from '../interfaces/queue-job.interface';
import {
  CreateTripRequestJobDto,
  CreateTripTimeoutJobDto,
  QueueStatsDto,
} from '../dto/trip-job.dto';
import { DriverTripQueueService } from '../../redis/services/driver-trip-queue.service';
import { LoggerService } from 'src/logger/logger.service';

interface QueueConfig {
  driverResponseTimeout: number;
  maxRetries: number;
  backoffDelay: number;
  cleanupIntervalMs: number;
  jobRetentionHours: number;
  maxJobsPerCleanup: number;
}

interface JobRemovalResult {
  tripRequestJobsRemoved: number;
  timeoutJobsRemoved: number;
  totalRemoved: number;
}

@Injectable()
export class TripQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly config: QueueConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    @InjectQueue('trip-requests') private readonly tripRequestQueue: Queue,
    @InjectQueue('trip-timeouts') private readonly tripTimeoutQueue: Queue,
    private readonly configService: ConfigService,
    private readonly driverTripQueueService: DriverTripQueueService,
    private readonly logger: LoggerService,
  ) {
    this.config = this.loadConfiguration();
  }

  async onModuleInit(): Promise<void> {
    await this.initializeQueues();
    this.startPeriodicCleanup();

    /**
    setTimeout(async () => {
      await this.checkTimeoutQueueHealth();
    }, 5000);
    setInterval(async () => {
      await this.checkTimeoutQueueHealth();
    }, 60000); 
     */
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown();
  }

  /**
   * Add a trip request job for a specific driver with enhanced error handling
   */
  async addTripRequest(
    jobData: CreateTripRequestJobDto,
    options?: QueueJobOptions,
  ): Promise<Job<TripRequestJob>> {
    try {
      this.validateTripRequestData(jobData);

      const priority = this.calculatePriority(
        jobData.priority,
        jobData.retryCount,
      );
      const jobId = this.generateJobId(
        'trip',
        jobData.tripId,
        jobData.driverId,
      );

      const jobOptions: JobsOptions = {
        jobId,
        priority,
        attempts: options?.attempts ?? this.config.maxRetries,
        backoff: options?.backoff ?? {
          type: 'exponential',
          delay: this.config.backoffDelay,
        },
        removeOnComplete: options?.removeOnComplete ?? 100,
        removeOnFail: options?.removeOnFail ?? 50,
        delay: options?.delay ?? 0,
      };

      this.logger.debug(
        `Adding trip request job: tripId=${jobData.tripId}, driverId=${jobData.driverId}, priority=${priority}`,
      );

      const job = await this.tripRequestQueue.add(
        'process-trip-request',
        jobData,
        jobOptions,
      );

      // Schedule timeout job with enhanced error handling
      await this.scheduleTimeoutJob(jobData);

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add trip request job: tripId=${jobData.tripId}, driverId=${jobData.driverId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add a timeout job with improved validation and error handling
   */
  async addTimeoutJob(
    jobData: CreateTripTimeoutJobDto,
    options?: QueueJobOptions,
  ): Promise<Job<TripTimeoutJob>> {
    try {
      this.validateTimeoutJobData(jobData);

      const delay = Math.max(0, jobData.scheduledAt.getTime() - Date.now());
      const jobId = this.generateJobId(
        'timeout-trip',
        jobData.tripId,
        jobData.driverId,
        jobData.timeoutType,
      );

      const jobOptions: JobsOptions = {
        jobId,
        delay,
        attempts: options?.attempts ?? 1,
        removeOnComplete: options?.removeOnComplete ?? 100,
        removeOnFail: options?.removeOnFail ?? 50,
      };

      const timeoutJob = await this.tripTimeoutQueue.add(
        'timeout-trip-request',
        jobData,
        jobOptions,
      );

      setTimeout(async () => {
        try {
          const job = await this.tripTimeoutQueue.getJob(timeoutJob.id!);
          if (job) {
            this.logger.debug(
              `🔍 JOB STATUS CHECK: jobId=${job.id}, state=${await job.getState()}, delay=${job.opts.delay}`,
            );
          } else {
            this.logger.warn(`⚠️ JOB NOT FOUND: jobId=${timeoutJob.id}`);
          }
        } catch (error) {
          this.logger.error(`❌ JOB STATUS CHECK FAILED: ${error.message}`);
        }
      }, 1000);

      return timeoutJob;
    } catch (error) {
      this.logger.error(
        `Failed to add timeout job: tripId=${jobData.tripId}, driverId=${jobData.driverId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove all jobs related to a specific trip (OPTIMIZED with bulk operations)
   */
  async removeJobsByTripId(tripId: string): Promise<JobRemovalResult> {
    try {
      this.logger.debug(`Removing all jobs for trip ${tripId}`);

      const [tripRequestResult, timeoutResult] = await Promise.allSettled([
        this.removeJobsByPattern(this.tripRequestQueue, `trip-${tripId}-`),
        this.removeJobsByPattern(
          this.tripTimeoutQueue,
          `timeout-trip-${tripId}-`,
        ),
      ]);

      const tripRequestJobsRemoved =
        tripRequestResult.status === 'fulfilled' ? tripRequestResult.value : 0;
      const timeoutJobsRemoved =
        timeoutResult.status === 'fulfilled' ? timeoutResult.value : 0;

      const result: JobRemovalResult = {
        tripRequestJobsRemoved,
        timeoutJobsRemoved,
        totalRemoved: tripRequestJobsRemoved + timeoutJobsRemoved,
      };

      this.logger.debug(
        `Removed ${result.totalRemoved} jobs for trip ${tripId}: ${result.tripRequestJobsRemoved} trip requests, ${result.timeoutJobsRemoved} timeouts`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to remove jobs for trip ${tripId}`, error);
      throw error;
    }
  }

  /**
   * Remove jobs for a specific driver and trip using job data filtering
   */
  async removeJobsByDriverAndTrip(
    driverId: string,
    tripId: string,
  ): Promise<JobRemovalResult> {
    try {
      this.logger.debug(
        `Removing jobs for driver ${driverId} and trip ${tripId}`,
      );

      const [tripRequestResult, timeoutResult] = await Promise.allSettled([
        this.removeJobsByDriverAndTripFromQueue(
          this.tripRequestQueue,
          driverId,
          tripId,
        ),
        this.removeJobsByDriverAndTripFromQueue(
          this.tripTimeoutQueue,
          driverId,
          tripId,
        ),
      ]);

      const tripRequestJobsRemoved =
        tripRequestResult.status === 'fulfilled' ? tripRequestResult.value : 0;
      const timeoutJobsRemoved =
        timeoutResult.status === 'fulfilled' ? timeoutResult.value : 0;

      const result: JobRemovalResult = {
        tripRequestJobsRemoved,
        timeoutJobsRemoved,
        totalRemoved: tripRequestJobsRemoved + timeoutJobsRemoved,
      };

      this.logger.debug(
        `Removed ${result.totalRemoved} jobs for driver ${driverId} and trip ${tripId}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to remove jobs for driver ${driverId} and trip ${tripId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics with error handling
   */
  async getQueueStats(): Promise<QueueStatsDto[]> {
    try {
      const [tripRequestStats, tripTimeoutStats] = await Promise.allSettled([
        this.getQueueStatsByName('trip-requests', this.tripRequestQueue),
        this.getQueueStatsByName('trip-timeouts', this.tripTimeoutQueue),
      ]);

      const stats: QueueStatsDto[] = [];

      if (tripRequestStats.status === 'fulfilled') {
        stats.push(tripRequestStats.value);
      } else {
        this.logger.warn(
          'Failed to get trip-requests stats',
          tripRequestStats.reason,
        );
      }

      if (tripTimeoutStats.status === 'fulfilled') {
        stats.push(tripTimeoutStats.value);
      } else {
        this.logger.warn(
          'Failed to get trip-timeouts stats',
          tripTimeoutStats.reason,
        );
      }

      return stats;
    } catch (error) {
      this.logger.error('Failed to get queue statistics', error);
      throw error;
    }
  }

  /**
   * Get jobs for a specific driver with improved filtering
   */
  async getDriverJobs(driverId: string): Promise<{
    active: Job<TripRequestJob>[];
    waiting: Job<TripRequestJob>[];
    delayed: Job<TripRequestJob>[];
  }> {
    try {
      const [activeJobs, waitingJobs, delayedJobs] = await Promise.all([
        this.tripRequestQueue.getJobs(['active'] as JobType[]),
        this.tripRequestQueue.getJobs(['waiting'] as JobType[]),
        this.tripRequestQueue.getJobs(['delayed'] as JobType[]),
      ]);

      const filterByDriver = (jobs: Job[]) =>
        jobs.filter((job) => job.data?.driverId === driverId);

      return {
        active: filterByDriver(activeJobs) as Job<TripRequestJob>[],
        waiting: filterByDriver(waitingJobs) as Job<TripRequestJob>[],
        delayed: filterByDriver(delayedJobs) as Job<TripRequestJob>[],
      };
    } catch (error) {
      this.logger.error(`Failed to get driver jobs for ${driverId}`, error);
      throw error;
    }
  }

  /**
   * Check if driver has pending jobs with optimized query
   */
  async hasDriverPendingJobs(
    driverId: string,
    excludeJobId?: string,
  ): Promise<boolean> {
    try {
      const driverJobs = await this.getDriverJobs(driverId);

      const allJobs = [
        ...driverJobs.active,
        ...driverJobs.waiting,
        ...driverJobs.delayed,
      ];

      if (excludeJobId) {
        return allJobs.some((job) => job.id?.toString() !== excludeJobId);
      }

      return allJobs.length > 0;
    } catch (error) {
      this.logger.error(
        `Failed to check pending jobs for driver ${driverId}`,
        error,
      );
      return false; // Safe default
    }
  }

  /**
   * Get all drivers with jobs for a specific trip using data filtering
   */
  async getDriversWithTripJobs(tripId: string): Promise<string[]> {
    try {
      const states: JobType[] = ['waiting', 'delayed', 'active'];
      const jobs = await this.tripRequestQueue.getJobs(states);

      const driverIds = jobs
        .filter((job) => job.data?.tripId === tripId)
        .map((job) => job.data.driverId)
        .filter(Boolean); // Remove undefined values

      return [...new Set(driverIds)]; // Remove duplicates
    } catch (error) {
      this.logger.error(`Failed to get drivers for trip ${tripId}`, error);
      return [];
    }
  }

  /**
   * Pause queues with proper error handling
   */
  async pauseQueues(): Promise<void> {
    try {
      await Promise.all([
        this.tripRequestQueue.pause(),
        this.tripTimeoutQueue.pause(),
      ]);
      this.logger.info('All queues paused successfully');
    } catch (error) {
      this.logger.error('Failed to pause queues', error);
      throw error;
    }
  }

  /**
   * Resume queues with proper error handling
   */
  async resumeQueues(): Promise<void> {
    try {
      await Promise.all([
        this.tripRequestQueue.resume(),
        this.tripTimeoutQueue.resume(),
      ]);
      this.logger.info('All queues resumed successfully');
    } catch (error) {
      this.logger.error('Failed to resume queues', error);
      throw error;
    }
  }

  /**
   * Add trip requests to driver queues sequentially (NEW SEQUENTIAL SYSTEM)
   */
  async addTripRequestSequential(
    tripId: string,
    driverIds: string[],
    customerLocation: { lat: number; lon: number },
    priority: number = 2,
  ): Promise<void> {
    try {
       /**
      this.logger.debug(
        `Adding trip ${tripId} to ${driverIds.length} driver queues sequentially`,
      );
      */
      // Add trip to each driver's queue
      for (const driverId of driverIds) {
        await this.driverTripQueueService.addTripToDriverQueue(
          driverId,
          tripId,
          priority,
          customerLocation,
        );
      }

      // Start processing for drivers who are not currently processing anything
      for (const driverId of driverIds) {
        // Small delay to ensure each driver gets processed independently
        setTimeout(() => this.processNextDriverRequest(driverId), 100);
      }
      /**
      this.logger.info(
        `Successfully added trip ${tripId} to ${driverIds.length} driver queues`,
      );
       */
    } catch (error) {
      this.logger.error(
        `Failed to add trip ${tripId} to driver queues sequentially`,
        error,
      );
      throw error;
    }
  }

  /**
   * Process next trip request for a specific driver (NEW SEQUENTIAL SYSTEM)
   */
  async processNextDriverRequest(driverId: string): Promise<void> {
    try {
      // Check if driver is already processing a trip
      const isProcessing =
        await this.driverTripQueueService.isDriverProcessingTrip(driverId);
      if (isProcessing) {
        this.logger.info(
          `Driver ${driverId} is already processing a trip, skipping`,
        );
        return;
      }

      // Get next trip from driver's queue
      const nextTrip =
        await this.driverTripQueueService.popNextTripForDriver(driverId);
      if (!nextTrip) {
        this.logger.debug(`No trips in queue for driver ${driverId}`);
        return;
      }

      await this.driverTripQueueService.setDriverProcessingTrip(
        driverId,
        nextTrip.tripId,
        this.config.driverResponseTimeout,
      );

      // Create Bull Queue job for this specific trip request
      const jobData: CreateTripRequestJobDto = {
        tripId: nextTrip.tripId,
        driverId,
        priority: nextTrip.priority,
        customerLocation: nextTrip.customerLocation,
        tripData: {
          customerId: '', // Will be filled by processor
        },
        retryCount: 0,
        originalDriverIds: [], // Will be filled by processor
      };

      await this.addTripRequest(jobData, {
        attempts: 1, // Single attempt for sequential processing
        removeOnComplete: 10,
        removeOnFail: 10,
      });


      /**
      this.logger.debug(
        `Started processing trip ${nextTrip.tripId} for driver ${driverId}`,
      );
       */
    } catch (error) {
      this.logger.error(
        `Failed to process next request for driver ${driverId}`,
        error,
      );
      // Clear processing status on error
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);
    }
  }

  /**
   * Handle driver response (accept/decline) for sequential system
   */
  async handleDriverResponse(
    driverId: string,
    tripId: string,
    accepted: boolean,
  ): Promise<void> {
    try {
      // Clear processing status
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);

      if (accepted) {
        // Driver accepted - remove all trips from their queue
        const removedCount =
          await this.driverTripQueueService.removeAllTripsForDriver(driverId);
        this.logger.info(
          `Driver ${driverId} accepted trip ${tripId}, removed ${removedCount} pending trips`,
        );

        // Remove this trip from all other driver queues and get affected drivers
        const { removedCount: totalRemovedFromOthers, affectedDrivers } =
          await this.driverTripQueueService.removeTripFromAllDriverQueuesWithAffectedDrivers(
            tripId,
          );

        this.logger.info(
          `Trip ${tripId} removed from ${totalRemovedFromOthers} other driver queues, affected drivers: ${affectedDrivers.join(', ')}`,
        );

        // OPTIMIZATION: Immediately process next trip for affected drivers
        for (const affectedDriverId of affectedDrivers) {
          if (affectedDriverId !== driverId) {
            try {
              await this.processNextDriverRequest(affectedDriverId);
              this.logger.debug(
                `Started processing next trip for affected driver ${affectedDriverId}`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to process next trip for affected driver ${affectedDriverId}: ${error.message}`,
              );
            }
          }
        }
      } else {
        // Driver declined - remove only this trip and process next
        await this.driverTripQueueService.removeSpecificTripFromDriver(
          driverId,
          tripId,
        );
        this.logger.debug(
          `Driver ${driverId} declined trip ${tripId}, processing next trip`,
        );

        // Process next trip in queue
        await this.processNextDriverRequest(driverId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle driver response: driver=${driverId}, trip=${tripId}, accepted=${accepted}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle timeout for sequential system
   */
  async handleDriverTimeout(driverId: string, tripId: string): Promise<void> {
    try {
      // Clear processing status
      await this.driverTripQueueService.clearDriverProcessingTrip(driverId);

      // Remove the timed-out trip
      await this.driverTripQueueService.removeSpecificTripFromDriver(
        driverId,
        tripId,
      );

      this.logger.debug(
        `Driver ${driverId} timed out for trip ${tripId}, processing next trip`,
      );

      // Process next trip in queue
      await this.processNextDriverRequest(driverId);
    } catch (error) {
      this.logger.error(
        `Failed to handle driver timeout: driver=${driverId}, trip=${tripId}`,
        error,
      );
    }
  }

  /**
   * Get driver queue status for monitoring
   */
  async getDriverQueueStatus(driverId: string) {
    return await this.driverTripQueueService.getDriverQueueStatus(driverId);
  }

  /**
   * Check timeout queue health and log detailed status
   */
  async checkTimeoutQueueHealth(): Promise<void> {
    try {
      this.logger.info('🔍 CHECKING TIMEOUT QUEUE HEALTH...');

      // Queue durumunu kontrol et
      const waiting = await this.tripTimeoutQueue.getWaiting();
      const active = await this.tripTimeoutQueue.getActive();
      const delayed = await this.tripTimeoutQueue.getDelayed();
      const completed = await this.tripTimeoutQueue.getCompleted();
      const failed = await this.tripTimeoutQueue.getFailed();

      this.logger.info(`📊 TIMEOUT QUEUE STATUS:
      - Waiting: ${waiting.length}
      - Active: ${active.length} 
      - Delayed: ${delayed.length}
      - Completed: ${completed.length}
      - Failed: ${failed.length}`);

      // Delayed job'ları detaylı kontrol et
      if (delayed.length > 0) {
        this.logger.info('⏰ DELAYED TIMEOUT JOBS:');
        for (const job of delayed.slice(0, 5)) {
          // İlk 5 job'ı göster
          const delay = job.opts.delay || 0;
          const scheduledTime = new Date(job.timestamp + delay);
          const now = new Date();
          const remainingMs = scheduledTime.getTime() - now.getTime();
          /**
          this.logger.info(
            `  - Job ${job.id}: scheduled for ${scheduledTime.toISOString()}, remaining: ${remainingMs}ms, data: ${JSON.stringify(job.data)}`,
          );
           */
        }
      }

      // Worker durumunu kontrol et
      const workers = await this.tripTimeoutQueue.getWorkers();
      this.logger.info(
        `👷 TIMEOUT QUEUE WORKERS: ${workers.length} active workers`,
      );
    } catch (error) {
      this.logger.error('❌ TIMEOUT QUEUE HEALTH CHECK FAILED:', error);
    }
  }

  /**
   * Enhanced cleanup with configurable parameters
   */
  async cleanupJobs(): Promise<void> {
    try {
      const cleanOlderThan = this.config.jobRetentionHours * 60 * 60 * 1000;
      const maxJobs = this.config.maxJobsPerCleanup;

      const [
        tripRequestCompleted,
        tripRequestFailed,
        tripTimeoutCompleted,
        tripTimeoutFailed,
      ] = await Promise.allSettled([
        this.tripRequestQueue.clean(cleanOlderThan, maxJobs, 'completed'),
        this.tripRequestQueue.clean(cleanOlderThan, maxJobs, 'failed'),
        this.tripTimeoutQueue.clean(cleanOlderThan, maxJobs, 'completed'),
        this.tripTimeoutQueue.clean(cleanOlderThan, maxJobs, 'failed'),
      ]);

      const getCount = (result: PromiseSettledResult<string[]>) =>
        result.status === 'fulfilled' ? result.value.length : 0;

      const totalCleaned =
        getCount(tripRequestCompleted) +
        getCount(tripRequestFailed) +
        getCount(tripTimeoutCompleted) +
        getCount(tripTimeoutFailed);

      this.logger.info(
        `Cleaned up ${totalCleaned} jobs (retention: ${this.config.jobRetentionHours}h)`,
      );
    } catch (error) {
      this.logger.error('Failed to cleanup jobs', error);
      throw error;
    }
  }

  // Private helper methods

  private loadConfiguration(): QueueConfig {
    return {
      driverResponseTimeout: this.configService.get(
        'tripDriverResponseTimeout',
        20,
      ),
      maxRetries: this.configService.get('queueMaxRetries', 3),
      backoffDelay: this.configService.get('queueBackoffDelay', 2000),
      cleanupIntervalMs: this.configService.get(
        'queueCleanupInterval',
        30 * 60 * 1000,
      ), // 30 mins
      jobRetentionHours: this.configService.get('jobRetentionHours', 24),
      maxJobsPerCleanup: this.configService.get('maxJobsPerCleanup', 1000),
    };
  }

  private async initializeQueues(): Promise<void> {
    try {
      // Add any queue initialization logic here
      this.logger.info('Queue service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize queues', error);
      throw error;
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupJobs();
      } catch (error) {
        this.logger.error('Periodic cleanup failed', error);
      }
    }, this.config.cleanupIntervalMs);

    this.logger.info(
      `Periodic cleanup started (interval: ${this.config.cleanupIntervalMs}ms)`,
    );
  }

  private async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.logger.info('Queue service shutdown completed');
  }

  private validateTripRequestData(data: CreateTripRequestJobDto): void {
    if (!data.tripId || !data.driverId) {
      throw new Error('TripId and driverId are required');
    }
    if (typeof data.priority !== 'number' || data.priority < 1) {
      throw new Error('Priority must be a positive number');
    }
  }

  private validateTimeoutJobData(data: CreateTripTimeoutJobDto): void {
    if (!data.tripId || !data.driverId || !data.timeoutType) {
      throw new Error('TripId, driverId, and timeoutType are required');
    }
    if (!(data.scheduledAt instanceof Date) || data.scheduledAt <= new Date()) {
      throw new Error('ScheduledAt must be a future date');
    }
  }

  private generateJobId(...parts: string[]): string {
    return `${parts.join('-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async scheduleTimeoutJob(
    jobData: CreateTripRequestJobDto,
  ): Promise<void> {
    this.logger.info(`Time Oıut job created for driver id: ${jobData.driverId}`);
    await this.addTimeoutJob({
      tripId: jobData.tripId,
      driverId: jobData.driverId,
      timeoutType: 'driver_response',
      scheduledAt: new Date(
        Date.now() + this.config.driverResponseTimeout * 1000,
      ),
      metadata: {
        customerLocation: jobData.customerLocation,
        originalDriverIds: jobData.originalDriverIds,
        retryCount: jobData.retryCount,
      },
    });
  }

  private calculatePriority(
    basePriority: number,
    retryCount: number = 0,
  ): number {
    return Math.max(1, basePriority - retryCount);
  }

  private async removeJobsByPattern(
    queue: Queue,
    pattern: string,
  ): Promise<number> {
    const states: JobType[] = ['waiting', 'delayed', 'active'];
    const jobs = await queue.getJobs(states);

    const jobsToRemove = jobs.filter((job) => {
      const jobId = job.id?.toString() || '';
      return jobId.startsWith(pattern);
    });

    await Promise.all(jobsToRemove.map((job) => job.remove()));
    return jobsToRemove.length;
  }

  private async removeJobsByDriverAndTripFromQueue(
    queue: Queue,
    driverId: string,
    tripId: string,
  ): Promise<number> {
    const states: JobType[] = ['waiting', 'delayed', 'active'];
    const jobs = await queue.getJobs(states);

    const jobsToRemove = jobs.filter(
      (job) => job.data?.driverId === driverId && job.data?.tripId === tripId,
    );

    await Promise.all(jobsToRemove.map((job) => job.remove()));
    return jobsToRemove.length;
  }

  private async getQueueStatsByName(
    queueName: string,
    queue: Queue,
  ): Promise<QueueStatsDto> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }
}
