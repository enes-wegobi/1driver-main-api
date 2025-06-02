import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';
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

    const jobOptions = {
      priority,
      attempts: options?.attempts || 3,
      backoff: options?.backoff || {
        type: 'exponential' as const,
        delay: 2000,
      },
      removeOnComplete: options?.removeOnComplete ?? 100,
      removeOnFail: options?.removeOnFail ?? 50,
      delay: options?.delay || 0,
    };

    this.logger.debug(
      `Adding trip request job: tripId=${jobData.tripId}, driverId=${jobData.driverId}, priority=${priority}`,
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

    const jobOptions = {
      delay,
      attempts: options?.attempts || 1,
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
  }

  /**
   * Remove all jobs related to a specific trip
   */
  async removeJobsByTripId(tripId: string): Promise<void> {
    this.logger.debug(`Removing all jobs for trip ${tripId}`);

    // Remove from trip requests queue
    const tripRequestJobs = await this.tripRequestQueue.getJobs([
      'waiting',
      'delayed',
      'active',
    ]);
    const tripRequestJobsToRemove = tripRequestJobs.filter(
      (job) => job.data.tripId === tripId,
    );

    // Remove from trip timeouts queue
    const tripTimeoutJobs = await this.tripTimeoutQueue.getJobs([
      'waiting',
      'delayed',
      'active',
    ]);
    const tripTimeoutJobsToRemove = tripTimeoutJobs.filter(
      (job) => job.data.tripId === tripId,
    );

    // Remove jobs
    await Promise.all([
      ...tripRequestJobsToRemove.map((job) => job.remove()),
      ...tripTimeoutJobsToRemove.map((job) => job.remove()),
    ]);

    this.logger.debug(
      `Removed ${tripRequestJobsToRemove.length} trip request jobs and ${tripTimeoutJobsToRemove.length} timeout jobs for trip ${tripId}`,
    );
  }

  /**
   * Remove jobs for a specific driver and trip
   */
  async removeJobsByDriverAndTrip(
    driverId: string,
    tripId: string,
  ): Promise<void> {
    this.logger.debug(
      `Removing jobs for driver ${driverId} and trip ${tripId}`,
    );

    // Remove from trip requests queue
    const tripRequestJobs = await this.tripRequestQueue.getJobs([
      'waiting',
      'delayed',
      'active',
    ]);
    const tripRequestJobsToRemove = tripRequestJobs.filter(
      (job) => job.data.tripId === tripId && job.data.driverId === driverId,
    );

    // Remove from trip timeouts queue
    const tripTimeoutJobs = await this.tripTimeoutQueue.getJobs([
      'waiting',
      'delayed',
      'active',
    ]);
    const tripTimeoutJobsToRemove = tripTimeoutJobs.filter(
      (job) => job.data.tripId === tripId && job.data.driverId === driverId,
    );

    // Remove jobs
    await Promise.all([
      ...tripRequestJobsToRemove.map((job) => job.remove()),
      ...tripTimeoutJobsToRemove.map((job) => job.remove()),
    ]);

    this.logger.debug(
      `Removed ${tripRequestJobsToRemove.length} trip request jobs and ${tripTimeoutJobsToRemove.length} timeout jobs for driver ${driverId} and trip ${tripId}`,
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
        ? jobs.filter((job) => job.id.toString() !== excludeJobId)
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
    const [tripRequestCleaned, tripTimeoutCleaned] = await Promise.all([
      this.tripRequestQueue.clean(24 * 60 * 60 * 1000, 'completed'), // 24 hours
      this.tripRequestQueue.clean(24 * 60 * 60 * 1000, 'failed'),
      this.tripTimeoutQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      this.tripTimeoutQueue.clean(24 * 60 * 60 * 1000, 'failed'),
    ]);

    this.logger.log(
      `Cleaned up jobs: trip-requests=${tripRequestCleaned}, trip-timeouts=${tripTimeoutCleaned}`,
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
