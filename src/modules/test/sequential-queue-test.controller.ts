import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TripQueueService } from '../../queue/services/trip-queue.service';
import { DriverTripQueueService } from '../../redis/services/driver-trip-queue.service';

@ApiTags('sequential-queue-test')
@Controller('test/sequential-queue')
export class SequentialQueueTestController {
  constructor(
    private readonly tripQueueService: TripQueueService,
    private readonly driverTripQueueService: DriverTripQueueService,
  ) {}

  @Post('add-trip')
  async addTripToQueues(@Body() body: {
    tripId: string;
    driverIds: string[];
    customerLocation: { lat: number; lon: number };
    priority?: number;
  }) {
    const { tripId, driverIds, customerLocation, priority = 2 } = body;
    
    await this.tripQueueService.addTripRequestSequential(
      tripId,
      driverIds,
      customerLocation,
      priority,
    );

    return {
      success: true,
      message: `Added trip ${tripId} to ${driverIds.length} driver queues`,
      tripId,
      driverIds,
    };
  }

  @Get('driver/:driverId/queue-status')
  async getDriverQueueStatus(@Param('driverId') driverId: string) {
    const status = await this.driverTripQueueService.getDriverQueueStatus(driverId);
    return {
      success: true,
      driverId,
      status,
    };
  }

  @Post('driver/:driverId/accept/:tripId')
  async simulateDriverAccept(
    @Param('driverId') driverId: string,
    @Param('tripId') tripId: string,
  ) {
    await this.tripQueueService.handleDriverResponse(driverId, tripId, true);
    
    return {
      success: true,
      message: `Driver ${driverId} accepted trip ${tripId}`,
      action: 'accepted',
    };
  }

  @Post('driver/:driverId/decline/:tripId')
  async simulateDriverDecline(
    @Param('driverId') driverId: string,
    @Param('tripId') tripId: string,
  ) {
    await this.tripQueueService.handleDriverResponse(driverId, tripId, false);
    
    return {
      success: true,
      message: `Driver ${driverId} declined trip ${tripId}`,
      action: 'declined',
    };
  }

  @Post('driver/:driverId/timeout/:tripId')
  async simulateDriverTimeout(
    @Param('driverId') driverId: string,
    @Param('tripId') tripId: string,
  ) {
    await this.tripQueueService.handleDriverTimeout(driverId, tripId);
    
    return {
      success: true,
      message: `Driver ${driverId} timed out for trip ${tripId}`,
      action: 'timeout',
    };
  }

  @Post('driver/:driverId/process-next')
  async processNextTrip(@Param('driverId') driverId: string) {
    await this.tripQueueService.processNextDriverRequest(driverId);
    
    return {
      success: true,
      message: `Processing next trip for driver ${driverId}`,
    };
  }

  @Get('trip/:tripId/drivers')
  async getDriversWithTrip(@Param('tripId') tripId: string) {
    const drivers = await this.driverTripQueueService.getDriversWithTripInQueue(tripId);
    
    return {
      success: true,
      tripId,
      driversWithTrip: drivers,
      count: drivers.length,
    };
  }

  @Post('trip/:tripId/remove-from-all')
  async removeTripFromAllQueues(@Param('tripId') tripId: string) {
    const removedCount = await this.driverTripQueueService.removeTripFromAllDriverQueues(tripId);
    
    return {
      success: true,
      tripId,
      removedFromDrivers: removedCount,
      message: `Removed trip ${tripId} from ${removedCount} driver queues`,
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

  @Post('cleanup-expired')
  async cleanupExpiredProcessing() {
    const cleanedCount = await this.driverTripQueueService.cleanupExpiredProcessingTrips();
    
    return {
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired processing trips`,
    };
  }

  @Post('test-timeout')
  async testTimeout(@Body() body: {
    tripId: string;
    driverId: string;
    delaySeconds?: number;
  }) {
    const { tripId, driverId, delaySeconds = 10 } = body;
    
    // Create a timeout job manually for testing
    const timeoutJob = await this.tripQueueService.addTimeoutJob({
      tripId,
      driverId,
      timeoutType: 'driver_response',
      scheduledAt: new Date(Date.now() + delaySeconds * 1000),
      metadata: {
        customerLocation: { lat: 41.0082, lon: 28.9784 },
      },
    });

    return {
      success: true,
      message: `Created timeout job for trip ${tripId} and driver ${driverId}`,
      jobId: timeoutJob.id,
      delaySeconds,
      scheduledAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    };
  }
}
