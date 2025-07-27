import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';
import { LoggerService } from 'src/logger/logger.service';
import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { UserType } from 'src/common/user-type.enum';
import {
  DriverLocationData,
  CustomerLocationData,
  DriverConnectionResult,
  CustomerConnectionResult,
} from '../interfaces/unified-user-data.interfaces';
import { RedisKeyGenerator } from '../redis-key.generator';

@Injectable()
export class UnifiedUserRedisService extends BaseRedisService {
  private readonly USER_STATUS_TTL = 30 * 60; // 30 minutes
  private readonly LOCATION_TTL = 15 * 60; // 15 minutes
  private readonly DRIVER_BACKGROUND_TTL = 40 * 60; // 40 minutes for background state preservation
  private readonly DRIVER_ON_TRIP_TTL = 2 * 60 * 60; // 2 hours for ON_TRIP state preservation

  constructor(
    configService: ConfigService,
    protected readonly customLogger: LoggerService,
  ) {
    super(configService, customLogger);
  }

  /**
   * Connect driver with preserve availability logic and force logout handling
   */
  @WithErrorHandling()
  async connectDriver(
    driverId: string,
    lat: number,
    lng: number,
    socketId: string,
    deviceId: string,
  ): Promise<DriverConnectionResult> {
    // 1. Get existing data to preserve availability status
    const existingData = await this.getDriverStatus(driverId);
    
    // 2. Determine if we need to force logout previous socket
    const shouldForceLogout = !!(existingData?.websocket?.socketId && 
                                 existingData.websocket.socketId !== socketId);
    
    const preservedAvailability = existingData?.availability || DriverAvailabilityStatus.AVAILABLE;

    const driverData: DriverLocationData = {
      lat,
      lng,
      timestamp: new Date().toISOString(),
      availability: preservedAvailability,
      appState: AppState.FOREGROUND,
      websocket: {
        socketId,
        deviceId,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      },
    };

    // 5. Store the new data
    const key = RedisKeyGenerator.getUserLocationKey(driverId);
    const pipeline = this.client.multi();
    
    pipeline.set(key, JSON.stringify(driverData));
    pipeline.expire(key, this.LOCATION_TTL);
    pipeline.sadd(RedisKeyGenerator.getActiveDriversSetKey(), driverId);
    pipeline.geoadd(RedisKeyGenerator.getDriverGeoKey(), lng, lat, driverId);

    await pipeline.exec();

    this.customLogger.info(
      `Driver ${driverId} connected with preserved availability: ${preservedAvailability}`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        preservedAvailability,
        shouldForceLogout,
        previousSocketId: existingData?.websocket?.socketId,
        newSocketId: socketId,
      },
    );

    return {
      userId: driverId,
      previousSocket: existingData?.websocket,
      preservedAvailability,
      shouldForceLogout,
    };
  }

  /**
   * Connect customer with optional location and force logout handling
   */
  @WithErrorHandling()
  async connectCustomer(
    customerId: string,
    socketId: string,
    deviceId: string,
    location?: { lat: number; lng: number },
  ): Promise<CustomerConnectionResult> {
    // 1. Get existing data to check for previous socket
    const existingData = await this.getCustomerStatus(customerId);
    
    // 2. Determine if we need to force logout previous socket
    const shouldForceLogout = !!(existingData?.websocket?.socketId && 
                                 existingData.websocket.socketId !== socketId);

    // 3. Create new customer data
    const customerData: CustomerLocationData = {
      ...(location && { lat: location.lat, lng: location.lng }),
      timestamp: new Date().toISOString(),
      isActive: true,
      appState: AppState.FOREGROUND, // Always foreground on connect
      websocket: {
        socketId,
        deviceId,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      },
    };

    // 4. Store the new data
    const key = RedisKeyGenerator.getUserLocationKey(customerId);
    const pipeline = this.client.multi();
    
    pipeline.set(key, JSON.stringify(customerData));
    pipeline.expire(key, this.USER_STATUS_TTL);
    pipeline.sadd(RedisKeyGenerator.getActiveCustomersSetKey(), customerId);

    await pipeline.exec();

    this.customLogger.info(
      `Customer ${customerId} connected`,
      {
        userId: customerId,
        userType: UserType.CUSTOMER,
        hasLocation: !!location,
        shouldForceLogout,
        previousSocketId: existingData?.websocket?.socketId,
        newSocketId: socketId,
      },
    );

    return {
      userId: customerId,
      previousSocket: existingData?.websocket,
      shouldForceLogout,
    };
  }

  /**
   * Update driver location coordinates
   */
  @WithErrorHandling()
  async updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<boolean> {
    const currentData = await this.getDriverStatus(driverId);
    if (!currentData) {
      return false;
    }

    const updatedData: DriverLocationData = {
      ...currentData,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    };

    const pipeline = this.client.multi();
    
    // Update location data
    pipeline.set(RedisKeyGenerator.getUserLocationKey(driverId), JSON.stringify(updatedData));
    pipeline.expire(RedisKeyGenerator.getUserLocationKey(driverId), this.LOCATION_TTL);
    
    // Update geo index
    pipeline.geoadd(RedisKeyGenerator.getDriverGeoKey(), lng, lat, driverId);

    await pipeline.exec();
    return true;
  }

  /**
   * Update driver availability status
   */
  @WithErrorHandling()
  async updateDriverAvailability(
    driverId: string,
    availability: DriverAvailabilityStatus,
  ): Promise<boolean> {
    const currentData = await this.getDriverStatus(driverId);
    if (!currentData) {
      return false;
    }

    const updatedData: DriverLocationData = {
      ...currentData,
      availability,
      timestamp: new Date().toISOString(),
    };

    await this.client.set(
      RedisKeyGenerator.getUserLocationKey(driverId),
      JSON.stringify(updatedData),
    );

    this.customLogger.info(
      `Driver ${driverId} availability updated to ${availability}`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        newAvailability: availability,
      },
    );

    return true;
  }

  /**
   * Get complete driver status and location data
   */
  @WithErrorHandling(null)
  async getDriverStatus(driverId: string): Promise<DriverLocationData | null> {
    const key = RedisKeyGenerator.getUserLocationKey(driverId);
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as DriverLocationData;
    } catch (error) {
      this.customLogger.logError(error, {
        userId: driverId,
        userType: UserType.DRIVER,
        action: 'parse_driver_status',
      });
      return null;
    }
  }

  /**
   * Check if driver is active
   */
  @WithErrorHandling(false)
  async isDriverActive(driverId: string): Promise<boolean> {
    const key = RedisKeyGenerator.getUserLocationKey(driverId);
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Get driver's current availability
   */
  @WithErrorHandling(DriverAvailabilityStatus.BUSY)
  async getDriverAvailability(driverId: string): Promise<DriverAvailabilityStatus> {
    const data = await this.getDriverStatus(driverId);
    return data?.availability || DriverAvailabilityStatus.BUSY;
  }

  /**
   * Set driver as inactive
   */
  @WithErrorHandling()
  async setDriverInactive(driverId: string): Promise<boolean> {
    const pipeline = this.client.multi();
    
    // Remove from location data
    pipeline.del(RedisKeyGenerator.getUserLocationKey(driverId));
    
    // Remove from active set
    pipeline.srem(RedisKeyGenerator.getActiveDriversSetKey(), driverId);
    
    // Remove from geo index
    pipeline.zrem(RedisKeyGenerator.getDriverGeoKey(), driverId);

    await pipeline.exec();

    this.customLogger.info(
      `Driver ${driverId} set as inactive`,
      { userId: driverId, userType: UserType.DRIVER },
    );

    return true;
  }

  // ===============================
  // CUSTOMER METHODS
  // ===============================

  /**
   * Get complete customer status data
   */
  @WithErrorHandling(null)
  async getCustomerStatus(customerId: string): Promise<CustomerLocationData | null> {
    const key = RedisKeyGenerator.getUserLocationKey(customerId);
    const data = await this.client.get(key);
    
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as CustomerLocationData;
    } catch (error) {
      this.customLogger.logError(error, {
        userId: customerId,
        userType: UserType.CUSTOMER,
        action: 'parse_customer_status',
      });
      return null;
    }
  }

  /**
   * Check if customer is active
   */
  @WithErrorHandling(false)
  async isCustomerActive(customerId: string): Promise<boolean> {
    const key = RedisKeyGenerator.getUserLocationKey(customerId);
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Set customer as inactive
   */
  @WithErrorHandling()
  async setCustomerInactive(customerId: string): Promise<boolean> {
    const pipeline = this.client.multi();
    
    // Remove from location data
    pipeline.del(RedisKeyGenerator.getUserLocationKey(customerId));
    
    // Remove from active set
    pipeline.srem(RedisKeyGenerator.getActiveCustomersSetKey(), customerId);

    await pipeline.exec();

    this.customLogger.info(
      `Customer ${customerId} set as inactive`,
      { userId: customerId, userType: UserType.CUSTOMER },
    );

    return true;
  }

  // ===============================
  // COMMON METHODS
  // ===============================

  /**
   * Update user app state
   */
  @WithErrorHandling()
  async updateAppState(
    userId: string,
    userType: UserType,
    appState: AppState,
  ): Promise<boolean> {
    let currentData: DriverLocationData | CustomerLocationData | null;
    const key = RedisKeyGenerator.getUserLocationKey(userId);

    if (userType === UserType.DRIVER) {
      currentData = await this.getDriverStatus(userId);
    } else {
      currentData = await this.getCustomerStatus(userId);
    }

    if (!currentData) {
      return false;
    }

    const updatedData = {
      ...currentData,
      appState,
      timestamp: new Date().toISOString(),
    };

    await this.client.set(key, JSON.stringify(updatedData));
    return true;
  }

  // ===============================
  // DISCONNECT METHODS
  // ===============================

  /**
   * Smart disconnect driver with state preservation based on app state and availability
   */
  @WithErrorHandling()
  async disconnectDriver(
    driverId: string,
    socketId?: string,
    appState?: AppState,
  ): Promise<boolean> {
    const currentData = await this.getDriverStatus(driverId);
    if (!currentData) {
      return false;
    }

    // Verify socket ID if provided
    if (socketId && currentData.websocket?.socketId !== socketId) {
      this.customLogger.warn(
        `Socket ID mismatch for driver ${driverId} disconnect`,
        {
          userId: driverId,
          userType: UserType.DRIVER,
          expectedSocketId: currentData.websocket?.socketId,
          providedSocketId: socketId,
        },
      );
      return false;
    }

    const currentAppState = appState || currentData.appState;
    const availability = currentData.availability;

    // Determine if we should preserve state (background mode)
    const shouldPreserve = currentAppState === AppState.BACKGROUND;

    if (shouldPreserve) {
      // Background disconnect - preserve state with appropriate TTL
      const ttl = availability === DriverAvailabilityStatus.ON_TRIP 
        ? this.DRIVER_ON_TRIP_TTL 
        : this.DRIVER_BACKGROUND_TTL;
      
      return await this.preserveDriverDataWithTTL(driverId, ttl, 'background_disconnect');
    } else {
      // Foreground disconnect - full cleanup
      return await this.setDriverInactive(driverId);
    }
  }

  /**
   * Disconnect customer with immediate full cleanup
   */
  @WithErrorHandling()
  async disconnectCustomer(
    customerId: string,
    socketId?: string,
  ): Promise<boolean> {
    const currentData = await this.getCustomerStatus(customerId);
    if (!currentData) {
      return false;
    }

    // Verify socket ID if provided
    if (socketId && currentData.websocket?.socketId !== socketId) {
      this.customLogger.warn(
        `Socket ID mismatch for customer ${customerId} disconnect`,
        {
          userId: customerId,
          userType: UserType.CUSTOMER,
          expectedSocketId: currentData.websocket?.socketId,
          providedSocketId: socketId,
        },
      );
      return false;
    }

    // Always immediate full cleanup for customers
    return await this.setCustomerInactive(customerId);
  }

  /**
   * Preserve driver data with custom TTL, removing only websocket info
   */
  @WithErrorHandling()
  async preserveDriverDataWithTTL(
    driverId: string,
    ttlSeconds: number,
    reason: string = 'preserve_state',
  ): Promise<boolean> {
    const currentData = await this.getDriverStatus(driverId);
    if (!currentData) {
      return false;
    }

    // Create preserved data without websocket info
    const preservedData: DriverLocationData = {
      ...currentData,
      websocket: undefined, // Remove websocket data
      timestamp: new Date().toISOString(),
    };

    const key = RedisKeyGenerator.getUserLocationKey(driverId);
    const pipeline = this.client.multi();

    // Update data with removed websocket and custom TTL
    pipeline.set(key, JSON.stringify(preservedData));
    pipeline.expire(key, ttlSeconds);

    // Keep driver in active set and geo index with same TTL
    pipeline.expire(RedisKeyGenerator.getActiveDriversSetKey(), ttlSeconds);
    pipeline.expire(RedisKeyGenerator.getDriverGeoKey(), ttlSeconds);

    await pipeline.exec();

    this.customLogger.info(
      `Driver ${driverId} data preserved with ${ttlSeconds}s TTL`,
      {
        userId: driverId,
        userType: UserType.DRIVER,
        ttlSeconds,
        reason,
        availability: currentData.availability,
        appState: currentData.appState,
      },
    );

    return true;
  }

//write cleanup service
}