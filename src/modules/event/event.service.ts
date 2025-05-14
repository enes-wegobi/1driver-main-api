import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from 'src/websocket/websocket.service';
import { DriversService } from 'src/modules/drivers/drivers.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { EventType } from './enum/event-type.enum';

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly driverStatusService: DriverStatusService,
    private readonly driversService: DriversService,
    private readonly expoNotificationsService: ExpoNotificationsService,
  ) {}

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

  async publish(event: any, driverIds: string[], eventType: EventType = EventType.TRIP_REQUEST): Promise<void> {
    try {
      const driversStatus =
        await this.driverStatusService.checkDriversActiveStatus(driverIds);

      const { activeDrivers, inactiveDrivers } =
        this.categorizeDriversByStatus(driversStatus);

      // Parallel operations promises
      const promises: Promise<any>[] = [];

      // Send to active drivers via WebSocket
      if (activeDrivers.length > 0) {
        promises.push(
          this.webSocketService.broadcastTripRequest(event, activeDrivers, eventType),
        );
      }

      // Send to inactive drivers via Expo push notifications
      if (inactiveDrivers.length > 0) {
        // Get driver info for all inactive drivers using the new batch method
        const driverInfos = await this.driversService.findMany(inactiveDrivers);

        // Send notifications to inactive drivers via Expo
        promises.push(
          this.expoNotificationsService.sendTripRequestNotificationsToInactiveDrivers(
            driverInfos,
            event,
            eventType,
          ),
        );
      }

      // Wait for all notifications to complete
      await Promise.all(promises);

      this.logger.log(
        `Completed sending ${eventType} to ${activeDrivers.length} active and ${inactiveDrivers.length} inactive drivers`,
      );
    } catch (error) {
      this.logger.error(`Error in publish: ${error.message}`);
    }
  }
}
