import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';

@Injectable()
export class ExpoNotificationsService implements OnModuleInit {
  private readonly logger = new Logger(ExpoNotificationsService.name);
  private expo: Expo;
  private expoEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      // Initialize Expo SDK
      this.expo = new Expo();
      this.expoEnabled = true;
      this.logger.log('Expo SDK initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Expo SDK: ${error.message}`);
    }
  }

  /**
   * Send a notification to a specific user via Expo
   */
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
          this.logger.error(`Error sending notification: ${ticket.details.error}`);
        } else {
          this.logger.error('Unknown error sending notification');
        }
        return false;
      }

      this.logger.debug(`Notification sent successfully: ${JSON.stringify(ticket)}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a notification to multiple users via Expo
   */
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
      const successCount = tickets.filter((ticket) => ticket.status === 'ok').length;
      const failureCount = tickets.filter((ticket) => ticket.status === 'error').length;

      this.logger.debug(
        `Multicast notification sent: ${successCount} successful, ${failureCount} failed`,
      );

      return {
        success: successCount,
        failure: failureCount,
      };
    } catch (error) {
      this.logger.error(`Error sending multicast notification: ${error.message}`);
      return { success: 0, failure: tokens.length };
    }
  }

  /**
   * Check and handle receipts for notifications
   * This should be called some time after sending notifications to check their delivery status
   */
  async checkNotificationReceipts(receiptIds: string[]): Promise<void> {
    if (!this.expoEnabled) {
      this.logger.warn('Expo is not enabled. Cannot check receipts.');
      return;
    }

    try {
      const receiptIdChunks = this.expo.chunkPushNotificationReceiptIds(receiptIds);

      for (const chunk of receiptIdChunks) {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

        // Process each receipt
        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'ok') {
            this.logger.debug(`Receipt ${receiptId}: Notification delivered successfully`);
          } else if (receipt.status === 'error') {
            const { details } = receipt;
            if (details && details.error) {
              this.logger.error(`Receipt ${receiptId}: ${details.error}`);
            } else {
              this.logger.error(`Receipt ${receiptId}: Unknown error`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error checking notification receipts: ${error.message}`);
    }
  }

  /**
   * Send a trip request notification to a driver via Expo
   */
  async sendTripRequestNotification(
    driverId: string,
    expoToken: string,
    tripId: string,
    pickupAddress: string,
    dropoffAddress: string,
    distanceKm: number,
    estimatedFare: number,
  ): Promise<boolean> {
    const title = 'New Trip Request';
    const body = `New trip request from ${pickupAddress} to ${dropoffAddress}`;

    const data = {
      tripId,
      type: 'trip_request',
      pickupAddress,
      dropoffAddress,
      distanceKm: distanceKm.toString(),
      estimatedFare: estimatedFare.toString(),
      timestamp: new Date().toISOString(),
    };

    return this.sendNotification(expoToken, title, body, data);
  }

  /**
   * Send a trip status update notification via Expo
   */
  async sendTripStatusUpdateNotification(
    userId: string,
    expoToken: string,
    tripId: string,
    status: string,
    message: string,
  ): Promise<boolean> {
    const title = 'Trip Status Update';
    const body = message;

    const data = {
      tripId,
      type: 'trip_status_update',
      status,
      timestamp: new Date().toISOString(),
    };

    return this.sendNotification(expoToken, title, body, data);
  }
}
