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
  private readonly logger = new Logger(TripQueueService.name);
  private readonly config: QueueConfig;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    @InjectQueue('trip-requests') private readonly tripRequestQueue: Queue,
    @InjectQueue('trip-timeouts') private readonly tripTimeoutQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.config = this.loadConfiguration();
  }

  async onModuleInit(): Promise<void> {
    await this.initializeQueues();
    this.startPeriodicCleanup();
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

      this.logger.debug(
        `Adding timeout job: tripId=${jobData.tripId}, driverId=${jobData.driverId}, type=${jobData.timeoutType}, delay=${delay}ms`,
      );

      return await this.tripTimeoutQueue.add(
        'timeout-trip-request',
        jobData,
        jobOptions,
      );
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
      this.logger.log('All queues paused successfully');
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
      this.logger.log('All queues resumed successfully');
    } catch (error) {
      this.logger.error('Failed to resume queues', error);
      throw error;
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

      this.logger.log(
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
        120,
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
      this.logger.log('Queue service initialized successfully');
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

    this.logger.log(
      `Periodic cleanup started (interval: ${this.config.cleanupIntervalMs}ms)`,
    );
  }

  private async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.logger.log('Queue service shutdown completed');
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
    return `${parts.join('-')}-${Date.now()}`;
  }

  private async scheduleTimeoutJob(
    jobData: CreateTripRequestJobDto,
  ): Promise<void> {
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
