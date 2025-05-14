import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { CustomersService } from 'src/modules/customers/customers.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { EventType } from './enum/event-type.enum';

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
  ) {}

  async notifyNewTripRequest(trip: any, driverIds: string[]): Promise<void> {
    await this.publishDriversEvent(trip, driverIds, EventType.TRIP_REQUEST);
  }

  async notifyTripAlreadyTaken(trip: any, driverIds: string[]): Promise<void> {
    await this.publishDriversEvent(trip, driverIds, EventType.TRIP_ALREADY_TAKEN);
  }

  async notifyCustomerTripApproved(trip: any, customerId: string): Promise<void> {
    try {
      const isActive = await this.customerStatusService.isCustomerActive(customerId);
      
      if (isActive) {
        // Send WebSocket notification to active customer
        await this.webSocketService.sendToUser(
          customerId,
          EventType.TRIP_ACCEPTED,
          trip
        );
        this.logger.log(`Sent trip approval WebSocket notification to active customer ${customerId}`);
      } else {
        // Send push notification to inactive customer
        // We'll need to get the customer's info to get their Expo token
        const customerInfo = await this.customersService.findOne(customerId);
        
        if (customerInfo && customerInfo.expoToken) {
          const result = await this.expoNotificationsService.sendNotification(
            customerInfo.expoToken,
            'Trip Approved',
            'A driver has approved your trip request!',
            {
              ...trip,
              type: EventType.TRIP_ACCEPTED,
              timestamp: new Date().toISOString(),
            }
          );
          
          this.logger.log(
            `Sent trip approval push notification to inactive customer ${customerId}: ${result ? 'success' : 'failed'}`
          );
        } else {
          this.logger.warn(`No Expo token found for customer ${customerId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error in notifyCustomerTripApproved: ${error.message}`);
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

  async publishDriversEvent(event: any, driverIds: string[], eventType: EventType = EventType.TRIP_REQUEST): Promise<void> {
    try {
      const driversStatus =
        await this.driverStatusService.checkDriversActiveStatus(driverIds);

      const { activeDrivers, inactiveDrivers } =
        this.categorizeDriversByStatus(driversStatus);

      const promises: Promise<any>[] = [];

      if (activeDrivers.length > 0) {
        promises.push(
          this.webSocketService.broadcastTripRequest(event, activeDrivers, eventType),
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
        `Completed sending ${eventType} to ${activeDrivers.length} active and ${inactiveDrivers.length} inactive drivers`,
      );
    } catch (error) {
      this.logger.error(`Error in publish: ${error.message}`);
    }
  }
}
