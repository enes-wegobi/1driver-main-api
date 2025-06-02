import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TripQueueService } from '../../queue/services/trip-queue.service';

@Controller('test/bull-queue')
export class BullQueueTestController {
  constructor(private readonly tripQueueService: TripQueueService) {}

  @Post('add-trip-request')
  async addTripRequest(@Body() body: any) {
    const job = await this.tripQueueService.addTripRequest({
      tripId: body.tripId || 'test-trip-123',
      driverId: body.driverId || 'test-driver-456',
      priority: body.priority || 2,
      customerLocation: body.customerLocation || { lat: 25.2048, lon: 55.2708 },
      tripData: {
        customerId: body.customerId || 'test-customer-789',
        estimatedDistance: 5000,
        estimatedDuration: 600,
        estimatedCost: 25.5,
        route: [
          { lat: 25.2048, lon: 55.2708, address: 'Dubai Mall' },
          { lat: 25.1972, lon: 55.2744, address: 'Burj Khalifa' },
        ],
      },
      retryCount: 0,
      originalDriverIds: [body.driverId || 'test-driver-456'],
    });

    return {
      success: true,
      message: 'Trip request job added to Bull Queue',
      jobId: job.id,
      jobData: job.data,
    };
  }

  @Post('add-timeout-job')
  async addTimeoutJob(@Body() body: any) {
    const job = await this.tripQueueService.addTimeoutJob({
      tripId: body.tripId || 'test-trip-123',
      driverId: body.driverId || 'test-driver-456',
      timeoutType: body.timeoutType || 'driver_response',
      scheduledAt: new Date(Date.now() + (body.delaySeconds || 10) * 1000),
      metadata: {
        customerLocation: { lat: 25.2048, lon: 55.2708 },
        retryCount: 0,
      },
    });

    return {
      success: true,
      message: 'Timeout job added to Bull Queue',
      jobId: job.id,
      jobData: job.data,
    };
  }

  @Get('queue-stats')
  async getQueueStats() {
    const stats = await this.tripQueueService.getQueueStats();
    return {
      success: true,
      stats,
    };
  }

  @Get('driver-jobs/:driverId')
  async getDriverJobs(@Param('driverId') driverId: string) {
    const jobs = await this.tripQueueService.getDriverJobs(driverId);
    return {
      success: true,
      driverId,
      jobs: {
        active: jobs.active.length,
        waiting: jobs.waiting.length,
        delayed: jobs.delayed.length,
      },
    };
  }

  @Post('remove-trip-jobs/:tripId')
  async removeTripJobs(@Param('tripId') tripId: string) {
    await this.tripQueueService.removeJobsByTripId(tripId);
    return {
      success: true,
      message: `All jobs for trip ${tripId} removed`,
    };
  }

  @Post('cleanup-jobs')
  async cleanupJobs() {
    await this.tripQueueService.cleanupJobs();
    return {
      success: true,
      message: 'Old completed and failed jobs cleaned up',
    };
  }

  @Post('pause-queues')
  async pauseQueues() {
    await this.tripQueueService.pauseQueues();
    return {
      success: true,
      message: 'All queues paused',
    };
  }

  @Post('resume-queues')
  async resumeQueues() {
    await this.tripQueueService.resumeQueues();
    return {
      success: true,
      message: 'All queues resumed',
    };
  }
}
