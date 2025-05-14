import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import {
  Expo,
  ExpoPushMessage,
  ExpoPushTicket,
  ExpoPushReceipt,
} from 'expo-server-sdk';
import { EventType } from 'src/modules/event/enum/event-type.enum';

@Injectable()
export class ExpoNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(ExpoNotificationsService.name);
  private expo: Expo;
  private expoEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      this.expo = new Expo();
      this.expoEnabled = true;
      this.logger.log('Expo SDK initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Expo SDK: ${error.message}`);
    }
  }

  async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<boolean> {
    if (!this.expoEnabled) {
      this.logger.warn('Expo is not enabled. Notification not sent.');
      return false;
    }

    try {
      if (!token) {
        this.logger.warn('No Expo token provided');
        return false;
      }

      // Check if the token is a valid Expo push token
      if (!Expo.isExpoPushToken(token)) {
        this.logger.warn(`Invalid Expo push token: ${token}`);
        return false;
      }

      // Create the message
      const message: ExpoPushMessage = {
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      };

      // Send the notification
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket.status === 'error') {
        if (ticket.details && ticket.details.error) {
          this.logger.error(
            `Error sending notification: ${ticket.details.error}`,
          );
        } else {
          this.logger.error('Unknown error sending notification');
        }
        return false;
      }

      this.logger.debug(
        `Notification sent successfully: ${JSON.stringify(ticket)}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      return false;
    }
  }

  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<{ success: number; failure: number }> {
    if (!this.expoEnabled) {
      this.logger.warn('Expo is not enabled. Multicast notification not sent.');
      return { success: 0, failure: tokens.length };
    }

    try {
      if (!tokens.length) {
        this.logger.warn('No Expo tokens provided for multicast');
        return { success: 0, failure: 0 };
      }

      // Filter out any invalid tokens
      const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

      if (validTokens.length === 0) {
        this.logger.warn('No valid Expo tokens provided for multicast');
        return { success: 0, failure: tokens.length };
      }

      // Create the messages
      const messages = validTokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      }));

      // Send the notifications
      const tickets = await this.expo.sendPushNotificationsAsync(messages);

      // Count successes and failures
      const successCount = tickets.filter(
        (ticket) => ticket.status === 'ok',
      ).length;
      const failureCount = tickets.filter(
        (ticket) => ticket.status === 'error',
      ).length;

      this.logger.debug(
        `Multicast notification sent: ${successCount} successful, ${failureCount} failed`,
      );

      return {
        success: successCount,
        failure: failureCount,
      };
    } catch (error) {
      this.logger.error(
        `Error sending multicast notification: ${error.message}`,
      );
      return { success: 0, failure: tokens.length };
    }
  }

  async sendTripRequestNotificationsToInactiveDrivers(
    driverInfos: any[],
    event: any,
    eventType: EventType = EventType.TRIP_REQUEST,
  ): Promise<{ success: number; failure: number }> {
    this.logger.log(
      `Sending ${eventType} notifications to ${driverInfos.length} inactive drivers`,
    );

    const validExpoTokens = driverInfos
      .filter((info) => info && info.expoToken)
      .map((info) => info.expoToken);

    if (validExpoTokens.length === 0) {
      this.logger.warn('No valid Expo tokens found for inactive drivers');
      return { success: 0, failure: 0 };
    }

    // Determine title and body based on event type
    let title = 'New Notification';
    let body = 'You have a new notification';
    
    if (eventType === EventType.TRIP_REQUEST) {
      title = 'New Trip Request';
      body = 'New trip request!';
    }

    const data = {
      ...event,
      type: eventType,
      timestamp: new Date().toISOString(),
    };

    const result = await this.sendMulticastNotification(
      validExpoTokens,
      title,
      body,
      data,
    );
    return result;
  }
}
