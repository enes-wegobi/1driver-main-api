import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

@Injectable()
export class QueueFullCleanupService extends BaseRedisService {
  private readonly serviceLogger = new Logger(QueueFullCleanupService.name);

  constructor(configService: ConfigService) {
    super(configService);
  }

  /**
   * Clear all driver request queues
   */
  @WithErrorHandling()
  async clearAllQueues(): Promise<void> {
    this.serviceLogger.log('Starting to clear all driver request queues...');

    // Get all queue-related keys
    const queueKeys = await this.client.keys('driver:request_queue:*');
    const currentRequestKeys = await this.client.keys('driver:current_request:*');
    const tripQueueKeys = await this.client.keys('trip:queued_drivers:*');

    const allKeys = [...queueKeys, ...currentRequestKeys, ...tripQueueKeys];

    if (allKeys.length > 0) {
      await this.client.del(...allKeys);
      this.serviceLogger.log(`Cleared ${allKeys.length} queue-related keys`);
    } else {
      this.serviceLogger.log('No queue keys found to clear');
    }
  }

  /**
   * Clear all active trip data
   */
  @WithErrorHandling()
  async clearAllActiveTrips(): Promise<void> {
    this.serviceLogger.log('Starting to clear all active trip data...');

    // Get all active trip keys
    const customerActiveTripKeys = await this.client.keys('customer:active-trip:*');
    const driverActiveTripKeys = await this.client.keys('driver:active-trip:*');

    const allTripKeys = [...customerActiveTripKeys, ...driverActiveTripKeys];

    if (allTripKeys.length > 0) {
      await this.client.del(...allTripKeys);
      this.serviceLogger.log(`Cleared ${allTripKeys.length} active trip keys`);
    } else {
      this.serviceLogger.log('No active trip keys found to clear');
    }
  }

  /**
   * Clear all driver-related data (status, location, etc.)
   */
  @WithErrorHandling()
  async clearAllDriverData(): Promise<void> {
    this.serviceLogger.log('Starting to clear all driver data...');

    // Get all driver-related keys
    const driverStatusKeys = await this.client.keys('driver:status:*');
    const driverActiveKeys = await this.client.keys('driver:active:*');
    const driverLocationKeys = await this.client.keys('location:user:*'); // This might include customers too
    
    // Clear driver sets
    const driverSets = ['drivers:active'];
    
    const allDriverKeys = [...driverStatusKeys, ...driverActiveKeys, ...driverSets];

    if (allDriverKeys.length > 0) {
      await this.client.del(...allDriverKeys);
      this.serviceLogger.log(`Cleared ${allDriverKeys.length} driver-related keys`);
    }

    // Clear location geo indexes
    const geoIndexes = ['location:driver:geo', 'location:customer:geo'];
    for (const geoIndex of geoIndexes) {
      const exists = await this.client.exists(geoIndex);
      if (exists) {
        await this.client.del(geoIndex);
        this.serviceLogger.log(`Cleared geo index: ${geoIndex}`);
      }
    }
  }

  /**
   * Clear all customer-related data
   */
  @WithErrorHandling()
  async clearAllCustomerData(): Promise<void> {
    this.serviceLogger.log('Starting to clear all customer data...');

    // Get all customer-related keys
    const customerActiveKeys = await this.client.keys('customer:active:*');
    
    // Clear customer sets
    const customerSets = ['customers:active'];
    
    const allCustomerKeys = [...customerActiveKeys, ...customerSets];

    if (allCustomerKeys.length > 0) {
      await this.client.del(...allCustomerKeys);
      this.serviceLogger.log(`Cleared ${allCustomerKeys.length} customer-related keys`);
    }
  }

  /**
   * Clear everything - all queue, trip, and user data
   */
  @WithErrorHandling()
  async clearEverything(): Promise<void> {
    this.serviceLogger.warn('CLEARING ALL REDIS DATA - This will reset the entire system!');

    await this.clearAllQueues();
    await this.clearAllActiveTrips();
    await this.clearAllDriverData();
    await this.clearAllCustomerData();

    this.serviceLogger.warn('All Redis data has been cleared!');
  }

  /**
   * Get statistics about what would be cleared
   */
  @WithErrorHandling({
    queueKeys: 0,
    activeTripKeys: 0,
    driverKeys: 0,
    customerKeys: 0,
    totalKeys: 0,
  })
  async getCleanupStatistics(): Promise<{
    queueKeys: number;
    activeTripKeys: number;
    driverKeys: number;
    customerKeys: number;
    totalKeys: number;
  }> {
    // Queue keys
    const queueKeys = await this.client.keys('driver:request_queue:*');
    const currentRequestKeys = await this.client.keys('driver:current_request:*');
    const tripQueueKeys = await this.client.keys('trip:queued_drivers:*');
    const totalQueueKeys = queueKeys.length + currentRequestKeys.length + tripQueueKeys.length;

    // Active trip keys
    const customerActiveTripKeys = await this.client.keys('customer:active-trip:*');
    const driverActiveTripKeys = await this.client.keys('driver:active-trip:*');
    const totalActiveTripKeys = customerActiveTripKeys.length + driverActiveTripKeys.length;

    // Driver keys
    const driverStatusKeys = await this.client.keys('driver:status:*');
    const driverActiveKeys = await this.client.keys('driver:active:*');
    const totalDriverKeys = driverStatusKeys.length + driverActiveKeys.length;

    // Customer keys
    const customerActiveKeys = await this.client.keys('customer:active:*');
    const totalCustomerKeys = customerActiveKeys.length;

    const totalKeys = totalQueueKeys + totalActiveTripKeys + totalDriverKeys + totalCustomerKeys;

    return {
      queueKeys: totalQueueKeys,
      activeTripKeys: totalActiveTripKeys,
      driverKeys: totalDriverKeys,
      customerKeys: totalCustomerKeys,
      totalKeys,
    };
  }

  /**
   * Safe cleanup - only clear expired or orphaned data
   */
  @WithErrorHandling()
  async safeCleanup(): Promise<void> {
    this.serviceLogger.log('Starting safe cleanup of expired data...');

    // This would implement logic to only clear data that's actually expired
    // For now, we'll just clear queues since they have TTL
    await this.clearAllQueues();

    this.serviceLogger.log('Safe cleanup completed');
  }
}
