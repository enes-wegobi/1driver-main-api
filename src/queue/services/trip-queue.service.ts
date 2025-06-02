import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
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

@Injectable()
export class TripQueueService {
  private readonly logger = new Logger(TripQueueService.name);
  private readonly driverResponseTimeout: number;

  constructor(
    @InjectQueue('trip-requests') private tripRequestQueue: Queue,
    @InjectQueue('trip-timeouts') private tripTimeoutQueue: Queue,
    private configService: ConfigService,
  ) {
    this.driverResponseTimeout = this.configService.get(
      'tripDriverResponseTimeout',
      120,
    );
  }

  /**
   * Add a trip request job for a specific driver
   */
  async addTripRequest(
    jobData: CreateTripRequestJobDto,
    options?: QueueJobOptions,
  ): Promise<Job<TripRequestJob>> {
    const priority = this.calculatePriority(
      jobData.priority,
      jobData.retryCount,
    );

    // Create custom job ID for efficient filtering
    const customJobId = `trip-${jobData.tripId}-driver-${jobData.driverId}-${Date.now()}`;

    const jobOptions = {
      jobId: customJobId,
      priority,
      attempts: options?.attempts || 3,
      backoff: options?.backoff || {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: options?.removeOnComplete ?? 100,
      removeOnFail: options?.removeOnFail ?? 50,
      delay: options?.delay || 0,
      // Tags for efficient filtering
      tags: [
        `driver:${jobData.driverId}`,
        `trip:${jobData.tripId}`,
        `driver-trip:${jobData.driverId}-${jobData.tripId}`,
      ],
    };

    this.logger.debug(
      `Adding trip request job: tripId=${jobData.tripId}, driverId=${jobData.driverId}, priority=${priority}, jobId=${customJobId}`,
    );

    const job = await this.tripRequestQueue.add(
      'process-trip-request',
      jobData,
      jobOptions,
    );

    // Schedule timeout job
    await this.addTimeoutJob({
      tripId: jobData.tripId,
      driverId: jobData.driverId,
      timeoutType: 'driver_response',
      scheduledAt: new Date(Date.now() + this.driverResponseTimeout * 1000),
      metadata: {
        customerLocation: jobData.customerLocation,
        originalDriverIds: jobData.originalDriverIds,
        retryCount: jobData.retryCount,
      },
    });

    return job;
  }

  /**
   * Add a timeout job
   */
  async addTimeoutJob(
    jobData: CreateTripTimeoutJobDto,
    options?: QueueJobOptions,
  ): Promise<Job<TripTimeoutJob>> {
    const delay = Math.max(0, jobData.scheduledAt.getTime() - Date.now());

    // Create custom job ID for efficient filtering
    const customJobId = `timeout-trip-${jobData.tripId}-driver-${jobData.driverId}-${jobData.timeoutType}-${Date.now()}`;

    const jobOptions = {
      jobId: customJobId,
      delay,
      attempts: options?.attempts || 1,
      removeOnComplete: options?.removeOnComplete ?? 100,
      removeOnFail: options?.removeOnFail ?? 50,
      // Tags for efficient filtering
      tags: [
        `driver:${jobData.driverId}`,
        `trip:${jobData.tripId}`,
        `driver-trip:${jobData.driverId}-${jobData.tripId}`,
        `timeout:${jobData.timeoutType}`,
      ],
    };

    this.logger.debug(
      `Adding timeout job: tripId=${jobData.tripId}, driverId=${jobData.driverId}, type=${jobData.timeoutType}, delay=${delay}ms, jobId=${customJobId}`,
    );

    return await this.tripTimeoutQueue.add(
      'timeout-trip-request',
      jobData,
      jobOptions,
    );
  }

  /**
   * Remove all jobs related to a specific trip (OPTIMIZED)
   * Uses custom job ID patterns for efficient removal
   */
  async removeJobsByTripId(tripId: string): Promise<void> {
    this.logger.debug(`Removing all jobs for trip ${tripId}`);

    // Get all jobs and filter by job ID pattern (more efficient than filtering by data)
    const [tripRequestJobs, tripTimeoutJobs] = await Promise.all([
      this.tripRequestQueue.getJobs(['waiting', 'delayed', 'active']),
      this.tripTimeoutQueue.getJobs(['waiting', 'delayed', 'active']),
    ]);

    // Filter by job ID pattern (faster than filtering by job.data)
    const tripRequestJobsToRemove = tripRequestJobs.filter((job) => {
      const jobId = job.id?.toString() || '';
      return jobId.startsWith(`trip-${tripId}-`);
    });

    const tripTimeoutJobsToRemove = tripTimeoutJobs.filter((job) => {
      const jobId = job.id?.toString() || '';
      return jobId.startsWith(`timeout-trip-${tripId}-`);
    });

    // Remove jobs in parallel
    await Promise.all([
      ...tripRequestJobsToRemove.map((job) => job.remove()),
      ...tripTimeoutJobsToRemove.map((job) => job.remove()),
    ]);

    this.logger.debug(
      `Removed ${tripRequestJobsToRemove.length} trip request jobs and ${tripTimeoutJobsToRemove.length} timeout jobs for trip ${tripId}`,
    );
  }

  /**
   * Remove jobs for a specific driver and trip (OPTIMIZED with Tags)
   */
  async removeJobsByDriverAndTrip(
    driverId: string,
    tripId: string,
  ): Promise<void> {
    this.logger.debug(
      `Removing jobs for driver ${driverId} and trip ${tripId}`,
    );

    // Use tags for efficient filtering - only get jobs with specific driver-trip combination
    const tag = `driver-trip:${driverId}-${tripId}`;
    
    const [tripRequestJobs, tripTimeoutJobs] = await Promise.all([
      this.tripRequestQueue.getJobsByTag(tag),
      this.tripTimeoutQueue.getJobsByTag(tag),
    ]);

    // Remove jobs in parallel - no filtering needed as tags are precise
    await Promise.all([
      ...tripRequestJobs.map((job) => job.remove()),
      ...tripTimeoutJobs.map((job) => job.remove()),
    ]);

    this.logger.debug(
      `Removed ${tripRequestJobs.length} trip request jobs and ${tripTimeoutJobs.length} timeout jobs for driver ${driverId} and trip ${tripId}`,
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<QueueStatsDto[]> {
    const [tripRequestStats, tripTimeoutStats] = await Promise.all([
      this.getQueueStatsByName('trip-requests', this.tripRequestQueue),
      this.getQueueStatsByName('trip-timeouts', this.tripTimeoutQueue),
    ]);

    return [tripRequestStats, tripTimeoutStats];
  }

  /**
   * Get jobs for a specific driver
   */
  async getDriverJobs(driverId: string): Promise<{
    active: Job<TripRequestJob>[];
    waiting: Job<TripRequestJob>[];
    delayed: Job<TripRequestJob>[];
  }> {
    const [activeJobs, waitingJobs, delayedJobs] = await Promise.all([
      this.tripRequestQueue.getJobs(['active']),
      this.tripRequestQueue.getJobs(['waiting']),
      this.tripRequestQueue.getJobs(['delayed']),
    ]);

    return {
      active: activeJobs.filter(
        (job) => job.data.driverId === driverId,
      ) as Job<TripRequestJob>[],
      waiting: waitingJobs.filter(
        (job) => job.data.driverId === driverId,
      ) as Job<TripRequestJob>[],
      delayed: delayedJobs.filter(
        (job) => job.data.driverId === driverId,
      ) as Job<TripRequestJob>[],
    };
  }

  /**
   * Check if driver has pending jobs
   */
  async hasDriverPendingJobs(
    driverId: string,
    excludeJobId?: string,
  ): Promise<boolean> {
    const driverJobs = await this.getDriverJobs(driverId);

    const filterJobs = (jobs: Job[]) =>
      excludeJobId
        ? jobs.filter((job) => job.id?.toString() !== excludeJobId)
        : jobs;

    return (
      filterJobs(driverJobs.active).length > 0 ||
      filterJobs(driverJobs.waiting).length > 0 ||
      filterJobs(driverJobs.delayed).length > 0
    );
  }

  /**
   * Get all drivers with jobs for a specific trip
   */
  async getDriversWithTripJobs(tripId: string): Promise<string[]> {
    const jobs = await this.tripRequestQueue.getJobs([
      'waiting',
      'delayed',
      'active',
    ]);
    const driverIds = jobs
      .filter((job) => job.data.tripId === tripId)
      .map((job) => job.data.driverId);

    return [...new Set(driverIds)]; // Remove duplicates
  }

  /**
   * Pause/Resume queues for maintenance
   */
  async pauseQueues(): Promise<void> {
    await Promise.all([
      this.tripRequestQueue.pause(),
      this.tripTimeoutQueue.pause(),
    ]);
    this.logger.log('All queues paused');
  }

  async resumeQueues(): Promise<void> {
    await Promise.all([
      this.tripRequestQueue.resume(),
      this.tripTimeoutQueue.resume(),
    ]);
    this.logger.log('All queues resumed');
  }

  /**
   * Clean up completed and failed jobs
   */
  async cleanupJobs(): Promise<void> {
    const cleanOlderThan = 24 * 60 * 60 * 1000; // 24 hours
    
    const [tripRequestCompleted, tripRequestFailed, tripTimeoutCompleted, tripTimeoutFailed] = await Promise.all([
      this.tripRequestQueue.clean(cleanOlderThan, 100, 'completed'),
      this.tripRequestQueue.clean(cleanOlderThan, 100, 'failed'),
      this.tripTimeoutQueue.clean(cleanOlderThan, 100, 'completed'),
      this.tripTimeoutQueue.clean(cleanOlderThan, 100, 'failed'),
    ]);

    const totalCleaned = tripRequestCompleted.length + tripRequestFailed.length + tripTimeoutCompleted.length + tripTimeoutFailed.length;
    
    this.logger.log(
      `Cleaned up ${totalCleaned} jobs: trip-requests=${tripRequestCompleted.length + tripRequestFailed.length}, trip-timeouts=${tripTimeoutCompleted.length + tripTimeoutFailed.length}`,
    );
  }

  // Private helper methods

  private calculatePriority(
    basePriority: number,
    retryCount: number = 0,
  ): number {
    // Lower number = higher priority in Bull
    // Increase priority (lower number) for retries
    return Math.max(1, basePriority - retryCount);
  }

  private async getQueueStatsByName(
    queueName: string,
    queue: Queue,
  ): Promise<QueueStatsDto> {
    const waiting = await queue.getWaiting();
    const active = await queue.getActive();
    const completed = await queue.getCompleted();
    const failed = await queue.getFailed();
    const delayed = await queue.getDelayed();

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
