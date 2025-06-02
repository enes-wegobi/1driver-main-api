import { Injectable, Logger } from '@nestjs/common';
import { DriverRequestQueueService } from 'src/redis/services/driver-request-queue.service';
import { TripService } from './trip.service';
import { TripStatus } from 'src/common/enums/trip-status.enum';

@Injectable()
export class QueueTestService {
  private readonly logger = new Logger(QueueTestService.name);

  constructor(
    private readonly driverRequestQueueService: DriverRequestQueueService,
    private readonly tripService: TripService,
  ) {}

  /**
   * Test the queue management system
   */
  async testQueueSystem(): Promise<{
    success: boolean;
    results: any[];
    message: string;
  }> {
    const results: any[] = [];
    
    try {
      this.logger.log('Starting queue system test...');

      // Test 1: Check if a driver has current request
      const testDriverId = 'test-driver-123';
      const currentRequest = await this.driverRequestQueueService.getDriverCurrentRequest(testDriverId);
      results.push({
        test: 'Get current request for new driver',
        result: currentRequest,
        expected: null,
        passed: currentRequest === null
      });

      // Test 2: Set current request
      const testTripId = 'test-trip-456';
      await this.driverRequestQueueService.setDriverCurrentRequest(testDriverId, testTripId);
      const newCurrentRequest = await this.driverRequestQueueService.getDriverCurrentRequest(testDriverId);
      results.push({
        test: 'Set and get current request',
        result: newCurrentRequest,
        expected: testTripId,
        passed: newCurrentRequest === testTripId
      });

      // Test 3: Add request to queue
      const queuedTripId = 'test-trip-789';
      await this.driverRequestQueueService.addRequestToDriverQueue(testDriverId, queuedTripId, 2);
      const queueStatus = await this.driverRequestQueueService.getDriverQueueStatus(testDriverId);
      results.push({
        test: 'Add request to queue',
        result: queueStatus,
        expected: { currentRequest: testTripId, queueLength: 1 },
        passed: queueStatus.currentRequest === testTripId && queueStatus.queueLength === 1
      });

      // Test 4: Get next request from queue
      const nextRequest = await this.driverRequestQueueService.getNextRequestForDriver(testDriverId);
      results.push({
        test: 'Get next request from queue',
        result: nextRequest,
        expected: queuedTripId,
        passed: nextRequest === queuedTripId
      });

      // Test 5: Remove request from queue
      await this.driverRequestQueueService.removeRequestFromDriverQueue(testDriverId, queuedTripId);
      const queueStatusAfterRemoval = await this.driverRequestQueueService.getDriverQueueStatus(testDriverId);
      results.push({
        test: 'Remove request from queue',
        result: queueStatusAfterRemoval.queueLength,
        expected: 0,
        passed: queueStatusAfterRemoval.queueLength === 0
      });

      // Test 6: Clear driver queue
      await this.driverRequestQueueService.clearDriverQueue(testDriverId);
      const finalQueueStatus = await this.driverRequestQueueService.getDriverQueueStatus(testDriverId);
      results.push({
        test: 'Clear driver queue',
        result: finalQueueStatus,
        expected: { currentRequest: null, queueLength: 0 },
        passed: finalQueueStatus.currentRequest === null && finalQueueStatus.queueLength === 0
      });

      const allPassed = results.every(r => r.passed);
      
      this.logger.log(`Queue system test completed. All tests passed: ${allPassed}`);
      
      return {
        success: allPassed,
        results,
        message: allPassed ? 'All queue tests passed!' : 'Some queue tests failed!'
      };

    } catch (error) {
      this.logger.error(`Queue system test failed: ${error.message}`);
      return {
        success: false,
        results,
        message: `Test failed with error: ${error.message}`
      };
    }
  }

  /**
   * Test queue behavior with multiple drivers and trips
   */
  async testMultiDriverQueue(): Promise<{
    success: boolean;
    scenario: string;
    results: any;
  }> {
    try {
      this.logger.log('Testing multi-driver queue scenario...');

      const driver1 = 'driver-001';
      const driver2 = 'driver-002';
      const driver3 = 'driver-003';
      
      const trip1 = 'trip-001';
      const trip2 = 'trip-002';
      const trip3 = 'trip-003';

      // Scenario: 3 drivers, 3 trips
      // Driver1 is busy with trip1
      // Trip2 and trip3 should be queued to all drivers
      
      // Step 1: Driver1 gets trip1 (becomes busy)
      await this.driverRequestQueueService.setDriverCurrentRequest(driver1, trip1);
      
      // Step 2: Trip2 comes - driver1 is busy, so it goes to queue for driver1, but directly to driver2 and driver3
      await this.driverRequestQueueService.addRequestToDriverQueue(driver1, trip2, 2);
      await this.driverRequestQueueService.setDriverCurrentRequest(driver2, trip2);
      await this.driverRequestQueueService.setDriverCurrentRequest(driver3, trip2);
      
      // Step 3: Trip3 comes - all drivers are busy, so it goes to all queues
      await this.driverRequestQueueService.addRequestToDriverQueue(driver1, trip3, 2);
      await this.driverRequestQueueService.addRequestToDriverQueue(driver2, trip3, 2);
      await this.driverRequestQueueService.addRequestToDriverQueue(driver3, trip3, 2);
      
      // Check queue states
      const queue1 = await this.driverRequestQueueService.getDriverQueueStatus(driver1);
      const queue2 = await this.driverRequestQueueService.getDriverQueueStatus(driver2);
      const queue3 = await this.driverRequestQueueService.getDriverQueueStatus(driver3);
      
      // Step 4: Driver2 declines trip2, should get trip3 from queue
      await this.driverRequestQueueService.clearDriverCurrentRequest(driver2);
      const nextForDriver2 = await this.driverRequestQueueService.getNextRequestForDriver(driver2);
      
      // Clean up
      await this.driverRequestQueueService.clearDriverQueue(driver1);
      await this.driverRequestQueueService.clearDriverQueue(driver2);
      await this.driverRequestQueueService.clearDriverQueue(driver3);
      
      const results = {
        initialQueues: { queue1, queue2, queue3 },
        nextForDriver2,
        expectedNextForDriver2: trip3,
        scenario: 'Multi-driver queue management test'
      };
      
      const success = nextForDriver2 === trip3;
      
      this.logger.log(`Multi-driver queue test completed. Success: ${success}`);
      
      return {
        success,
        scenario: 'Multi-driver queue with busy drivers',
        results
      };
      
    } catch (error) {
      this.logger.error(`Multi-driver queue test failed: ${error.message}`);
      return {
        success: false,
        scenario: 'Multi-driver queue test failed',
        results: { error: error.message }
      };
    }
  }

  /**
   * Get current queue statistics for monitoring
   */
  async getQueueStatistics(): Promise<any> {
    try {
      // This would be useful for monitoring the queue system
      return await this.driverRequestQueueService.getQueueStatistics();
    } catch (error) {
      this.logger.error(`Failed to get queue statistics: ${error.message}`);
      return { error: error.message };
    }
  }
}
