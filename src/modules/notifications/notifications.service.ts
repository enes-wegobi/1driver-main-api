import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import * as admin from 'firebase-admin';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: admin.app.App;
  private fcmEnabled = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    try {
      const firebaseConfig = this.configService.firebase;

      if (!firebaseConfig || !firebaseConfig.projectId) {
        this.logger.warn(
          'Firebase configuration not found. FCM notifications will be disabled.',
        );
        return;
      }
      //ExponentPushToken[Jp0VKuFEVFjRCrEe7CXfe3]
      // Initialize Firebase Admin SDK
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: firebaseConfig.projectId,
          clientEmail: firebaseConfig.clientEmail,
          privateKey: firebaseConfig.privateKey.replace(/\\n/g, '\n'),
        }),
      });

      this.fcmEnabled = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error(
        `Failed to initialize Firebase Admin SDK: ${error.message}`,
      );
    }
  }

  /**
   * Send a notification to a specific user
   */
  async sendNotification(dto: SendNotificationDto): Promise<boolean> {
    if (!this.fcmEnabled) {
      this.logger.warn('FCM is not enabled. Notification not sent.');
      return false;
    }

    try {
      if (!dto.fcmToken) {
        this.logger.warn(`No FCM token provided for user ${dto.userId}`);
        return false;
      }

      const message: admin.messaging.Message = {
        token: dto.fcmToken,
        notification: {
          title: dto.title,
          body: dto.body,
        },
        data: dto.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.debug(`Notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a notification to multiple users
   */
  async sendMulticastNotification(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: number; failure: number }> {
    if (!this.fcmEnabled) {
      this.logger.warn('FCM is not enabled. Multicast notification not sent.');
      return { success: 0, failure: tokens.length };
    }

    try {
      if (!tokens.length) {
        this.logger.warn('No FCM tokens provided for multicast');
        return { success: 0, failure: 0 };
      }

      // Filter out any empty tokens
      const validTokens = tokens.filter((token) => !!token);

      if (validTokens.length === 0) {
        return { success: 0, failure: 0 };
      }

      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.debug(
        `Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`,
      );
      return {
        success: response.successCount,
        failure: response.failureCount,
      };
    } catch (error) {
      this.logger.error(
        `Error sending multicast notification: ${error.message}`,
      );
      return { success: 0, failure: tokens.length };
    }
  }

  /**
   * Send a notification to a topic
   */
  async sendTopicNotification(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.fcmEnabled) {
      this.logger.warn('FCM is not enabled. Topic notification not sent.');
      return false;
    }

    try {
      const message: admin.messaging.Message = {
        topic,
        notification: {
          title,
          body,
        },
        data: data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);
      this.logger.debug(`Topic notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending topic notification: ${error.message}`);
      return false;
    }
  }

  /**
   * Subscribe a device to a topic
   */
  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    if (!this.fcmEnabled) {
      this.logger.warn('FCM is not enabled. Topic subscription failed.');
      return false;
    }

    try {
      await admin.messaging().subscribeToTopic(token, topic);
      this.logger.debug(`Device subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Error subscribing to topic: ${error.message}`);
      return false;
    }
  }

  /**
   * Unsubscribe a device from a topic
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    if (!this.fcmEnabled) {
      this.logger.warn('FCM is not enabled. Topic unsubscription failed.');
      return false;
    }

    try {
      await admin.messaging().unsubscribeFromTopic(token, topic);
      this.logger.debug(`Device unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Error unsubscribing from topic: ${error.message}`);
      return false;
    }
  }

  /**
   * Send a trip request notification to a driver
   */
  async sendTripRequestNotification(
    driverId: string,
    fcmToken: string,
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

    return this.sendNotification({
      userId: driverId,
      fcmToken,
      title,
      body,
      data,
    });
  }

  /**
   * Send a trip status update notification
   */
  async sendTripStatusUpdateNotification(
    userId: string,
    fcmToken: string,
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

    return this.sendNotification({
      userId,
      fcmToken,
      title,
      body,
      data,
    });
  }
}
