import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { EventType } from './enum/event-type.enum';
import { MapsService } from 'src/clients/maps/maps.service';
import {
  BatchDistanceRequest,
  BatchDistanceResponse,
} from 'src/clients/maps/maps.interface';
import { RedisService } from 'src/redis/redis.service';
import { S3Service } from 'src/s3/s3.service';
import { CustomerData, DriverData } from './constants/trip.constant';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly driversService: DriversService,
    private readonly customersService: CustomersService,
    private readonly expoNotificationsService: ExpoNotificationsService,
    private readonly mapsService: MapsService,
    private readonly redisService: RedisService,
    private readonly s3Service: S3Service,
  ) {}

  async notifyNewTripRequest(trip: any, driverIds: string[]): Promise<void> {
    await this.notifyDriversWithDistanceInfo(
      trip,
      driverIds,
      EventType.TRIP_REQUESTED,
    );
  }

  async notifyTripAlreadyTaken(trip: any, driverIds: string[]): Promise<void> {
    await this.broadcastEventToDrivers(
      trip,
      driverIds,
      EventType.TRIP_ALREADY_TAKEN,
    );
  }

  async notifyCustomer(
    trip: any,
    customerId: string,
    eventType: EventType,
  ): Promise<void> {
    try {
      const isActive =
        await this.customerStatusService.isCustomerActive(customerId);
      if (isActive) {
        await this.webSocketService.sendToUser(customerId, eventType, trip);
        this.logger.log(
          `Sent trip approval WebSocket notification to active customer ${customerId}`,
        );
      } else {
        const customer = await this.customersService.findOne(customerId);
        //TODO add driver data to expo notif
        if (customer && customer.expoToken) {
          const result = await this.expoNotificationsService.sendNotification(
            customer.expoToken,
            'Trip Approved',
            'A driver has approved your trip request!',
            {
              ...trip,
              type: EventType.TRIP_DRIVER_ASSIGNED,
              timestamp: new Date().toISOString(),
            },
          );

          this.logger.log(
            `Sent trip approval push notification to inactive customer ${customerId}: ${result ? 'success' : 'failed'}`,
          );
        } else {
          this.logger.warn(`No Expo token found for customer ${customerId}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in notifyCustomerTripApproved: ${error.message}`,
      );
    }
  }

  async notifyCustomerDriverNotFound(
    trip: any,
    customerId: string,
  ): Promise<void> {
    try {
      const isActive =
        await this.customerStatusService.isCustomerActive(customerId);

      if (isActive) {
        await this.webSocketService.sendToUser(
          customerId,
          EventType.TRIP_DRIVER_NOT_FOUND,
          trip,
        );
        this.logger.log(
          `Sent driver not found WebSocket notification to active customer ${customerId}`,
        );
      } else {
        const customer = await this.customersService.findOne(customerId);
        if (customer && customer.expoToken) {
          const result = await this.expoNotificationsService.sendNotification(
            customer.expoToken,
            'No Drivers Available',
            "We couldn't find any available drivers for your trip.",
            {
              ...trip,
              type: EventType.TRIP_DRIVER_NOT_FOUND,
              timestamp: new Date().toISOString(),
            },
          );

          this.logger.log(
            `Sent driver not found push notification to inactive customer ${customerId}: ${result ? 'success' : 'failed'}`,
          );
        } else {
          this.logger.warn(`No Expo token found for customer ${customerId}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in notifyCustomerDriverNotFound: ${error.message}`,
      );
    }
  }

  private categorizeDriversByStatus(driversStatus: any[]): {
    activeDrivers: string[];
    inactiveDrivers: string[];
  } {
    return driversStatus.reduce<{
      activeDrivers: string[];
      inactiveDrivers: string[];
    }>(
      (result, driver) => {
        if (driver.isActive) {
          result.activeDrivers.push(driver.driverId);
        } else {
          result.inactiveDrivers.push(driver.driverId);
        }
        return result;
      },
      { activeDrivers: [], inactiveDrivers: [] },
    );
  }

  async getDriversDistancesFromPoint(
    referencePoint: { lat: number; lon: number },
    driverIds: string[],
  ): Promise<BatchDistanceResponse> {
    try {
      this.logger.log(
        `Calculating distances from point (${referencePoint.lat},${referencePoint.lon}) to ${driverIds.length} drivers`,
      );

      // Get all driver locations in a single operation
      const driverLocationsMap =
        await this.redisService.getUserLocations(driverIds);

      // Format driver locations for batch distance calculation
      const driverLocations: Array<{
        driverId: string;
        coordinates: {
          lat: number;
          lon: number;
        };
      }> = [];

      // Process the location map
      Object.entries(driverLocationsMap).forEach(([driverId, location]) => {
        if (location && location.latitude && location.longitude) {
          driverLocations.push({
            driverId,
            coordinates: {
              lat: location.latitude,
              lon: location.longitude,
            },
          });
        }
      });

      if (driverLocations.length === 0) {
        this.logger.warn('No driver locations found');
        return {
          success: true,
          referencePoint,
          results: {},
        };
      }

      // Prepare batch distance request
      const batchDistanceRequest: BatchDistanceRequest = {
        referencePoint,
        driverLocations,
      };

      // Calculate distances in batch
      this.logger.log(
        `Calculating distances to ${driverLocations.length} driver locations`,
      );
      const distanceResults =
        await this.mapsService.getBatchDistances(batchDistanceRequest);

      this.logger.log(
        `Batch distance calculation completed. Got distances for ${
          Object.keys(distanceResults.results || {}).length
        } drivers`,
      );

      return distanceResults;
    } catch (error) {
      this.logger.error(`Error calculating batch distances: ${error.message}`);
      return {
        success: false,
        message: 'Error calculating distances',
        error: error.message,
      };
    }
  }

  /**
   * Notifies drivers with enhanced trip data including distance information
   * Sends individual notifications to each driver with personalized distance data
   */
  async notifyDriversWithDistanceInfo(
    trip: any,
    driverIds: string[],
    eventType: EventType,
  ): Promise<void> {
    try {
      const { activeDrivers, inactiveDrivers } =
        await this.getDriversByActiveStatus(driverIds);

      const distanceResults = await this.getDriversDistancesFromPoint(
        { lat: trip.route[0].lat, lon: trip.route[0].lon },
        driverIds,
      );

      let customerData: CustomerData | null = null;
      if (trip.customer) {
        customerData = trip.customer;

        // Generate photo URL if photoKey exists
        if (customerData && customerData.photoKey) {
          const photoUrl = await this.s3Service.getSignedUrl(
            customerData.photoKey,
          );
          customerData.photoUrl = photoUrl || undefined;
        }
      }

      const promises: Promise<any>[] = [];

      if (activeDrivers.length > 0) {
        for (const driverId of activeDrivers) {
          const driverDistanceInfo = distanceResults.results?.[driverId];

          const enhancedTripData = {
            ...trip,
            driverDistanceInfo: {
              distance: driverDistanceInfo?.distance,
              duration: driverDistanceInfo?.duration,
            },
            customer: customerData,
          };

          promises.push(
            this.webSocketService.sendTripRequest(
              enhancedTripData,
              driverId,
              eventType,
            ),
          );
        }
      }

      if (inactiveDrivers.length > 0) {
        const driverInfos = await this.driversService.findMany(inactiveDrivers);

        for (let i = 0; i < inactiveDrivers.length; i++) {
          const driverId = inactiveDrivers[i];
          const driverInfo = driverInfos[i];

          if (!driverInfo) continue;

          const driverDistanceInfo = distanceResults.results?.[driverId];

          const enhancedTripData = {
            ...trip,
            driverDistanceInfo: {
              distance: driverDistanceInfo?.distance,
              duration: driverDistanceInfo?.duration,
            },
            customer: customerData,
          };

          promises.push(
            this.expoNotificationsService.sendTripRequestNotificationToInactiveDriver(
              driverInfo,
              enhancedTripData,
              eventType,
            ),
          );
        }
      }

      await Promise.all(promises);

      this.logger.log(
        `Completed sending ${eventType} to ${activeDrivers.length} active and ${inactiveDrivers.length} inactive drivers`,
      );
    } catch (error) {
      this.logger.error(
        `Error in notifyDriversWithDistanceInfo: ${error.message}`,
      );
    }
  }

  /**
   * Broadcasts the same event to multiple drivers
   * Uses efficient broadcasting for active drivers and batch notifications for inactive drivers
   */
  async broadcastEventToDrivers(
    event: any,
    driverIds: string[],
    eventType: EventType,
  ): Promise<void> {
    try {
      const { activeDrivers, inactiveDrivers } =
        await this.getDriversByActiveStatus(driverIds);

      const promises: Promise<any>[] = [];

      if (activeDrivers.length > 0) {
        promises.push(
          this.webSocketService.broadcastTripRequest(
            event,
            activeDrivers,
            eventType,
          ),
        );
      }

      if (inactiveDrivers.length > 0) {
        const driverInfos = await this.driversService.findMany(inactiveDrivers);

        promises.push(
          this.expoNotificationsService.sendTripRequestNotificationsToInactiveDrivers(
            driverInfos,
            event,
            eventType,
          ),
        );
      }

      await Promise.all(promises);

      this.logger.log(
        `Completed broadcasting ${eventType} to ${activeDrivers.length} active and ${inactiveDrivers.length} inactive drivers`,
      );
    } catch (error) {
      this.logger.error(`Error in broadcastEventToDrivers: ${error.message}`);
    }
  }

  /**
   * Gets drivers categorized by their active status
   */
  private async getDriversByActiveStatus(driverIds: string[]): Promise<{
    activeDrivers: string[];
    inactiveDrivers: string[];
  }> {
    const driversStatus =
      await this.driverStatusService.checkDriversActiveStatus(driverIds);
    return this.categorizeDriversByStatus(driversStatus);
  }
}
