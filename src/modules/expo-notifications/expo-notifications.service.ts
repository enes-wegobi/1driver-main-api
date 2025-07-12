import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { LoggerService } from 'src/logger/logger.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';

export interface SecurityAlertData {
  type: 'FORCE_LOGOUT' | 'DEVICE_MISMATCH' | 'SUSPICIOUS_ACTIVITY' | 'SESSION_EXPIRED';
  deviceId?: string;
  ipAddress?: string;
  timestamp: string;
  reason?: string;
  newDeviceInfo?: any;
}

export interface SecurityAlert {
  title: string;
  body: string;
  data: SecurityAlertData;
  sound?: 'default' | 'critical';
  priority?: 'default' | 'high';
}

@Injectable()
export class ExpoNotificationsService implements OnModuleInit {
  private expo: Expo;
  private expoEnabled = false;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      const accessToken = this.configService.get<string>('expo.accessToken');

      if (!accessToken) {
        this.logger.warn(
          'Expo access token not provided. Push notifications will be disabled.',
        );
        this.expoEnabled = false;
        return;
      }

      // Initialize Expo client with access token
      this.expo = new Expo({
        accessToken: accessToken,
      });

      this.expoEnabled = true;
      this.logger.info('Expo SDK initialized successfully with access token');
    } catch (error) {
      this.logger.error(`Failed to initialize Expo SDK: ${error.message}`);
      this.expoEnabled = false;
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

  /**
   * Send notifications to multiple users (generic method)
   */
  async sendNotificationsToUsers(
    userInfos: any[],
    eventType: EventType,
    customTitle?: string,
    customBody?: string,
    customData?: Record<string, any>,
  ): Promise<{ success: number; failure: number }> {
    this.logger.info(
      `Sending ${eventType} notifications to ${userInfos.length} users`,
    );

    const validExpoTokens = userInfos
      .filter((info) => info && info.expoToken)
      .map((info) => info.expoToken);

    if (validExpoTokens.length === 0) {
      this.logger.warn('No valid Expo tokens found for users');
      return { success: 0, failure: 0 };
    }

    // Use custom title/body if provided, otherwise use defaults
    const title = customTitle || 'New Notification';
    const body = customBody || 'You have a new notification';

    const data = {
      type: eventType,
      timestamp: new Date().toISOString(),
      ...customData,
    };

    return this.sendMulticastNotification(validExpoTokens, title, body, data);
  }

  /**
   * Generate security alert message based on type
   */
  private generateSecurityAlert(
    alertType: SecurityAlertData['type'],
    userType: UserType,
    alertData: Partial<SecurityAlertData>,
  ): SecurityAlert {
    const timestamp = new Date().toISOString();
    const baseData: SecurityAlertData = {
      type: alertType,
      timestamp,
      ...alertData,
    };

    switch (alertType) {
      case 'FORCE_LOGOUT':
        return {
          title: 'Oturum Sonlandırıldı',
          body: 'Hesabınız başka bir cihazdan açıldı. Güvenliğiniz için eski cihazınız oturumu kapatıldı.',
          data: baseData,
          sound: 'critical',
          priority: 'high',
        };

      case 'DEVICE_MISMATCH':
        return {
          title: 'Güvenlik Uyarısı',
          body: 'Hesabınıza farklı bir cihazdan erişim girişimi tespit edildi.',
          data: baseData,
          sound: 'critical',
          priority: 'high',
        };

      case 'SUSPICIOUS_ACTIVITY':
        return {
          title: 'Şüpheli Aktivite',
          body: 'Hesabınızda olağandışı aktivite tespit ettik. Güvenliğinizi kontrol edin.',
          data: baseData,
          sound: 'default',
          priority: 'high',
        };

      case 'SESSION_EXPIRED':
        return {
          title: 'Oturum Süresi Doldu',
          body: 'Güvenliğiniz için oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.',
          data: baseData,
          sound: 'default',
          priority: 'default',
        };

      default:
        return {
          title: 'Güvenlik Bildirimi',
          body: 'Hesabınızla ilgili güvenlik bildirimi.',
          data: baseData,
          sound: 'default',
          priority: 'default',
        };
    }
  }

  /**
   * Send security alert notification
   * @param token Expo push token
   * @param userType User type for localized messages
   * @param alertType Type of security alert
   * @param alertData Additional alert data
   */
  async sendSecurityAlert(
    token: string,
    userType: UserType,
    alertType: SecurityAlertData['type'],
    alertData?: Partial<SecurityAlertData>,
  ): Promise<boolean> {
    if (!this.expoEnabled) {
      this.logger.warn('Expo is not enabled. Security alert not sent.');
      return false;
    }

    try {
      if (!token || !Expo.isExpoPushToken(token)) {
        this.logger.warn(`Invalid Expo token for security alert: ${token}`);
        return false;
      }

      const alert = this.generateSecurityAlert(alertType, userType, alertData || {});

      const message: ExpoPushMessage = {
        to: token,
        sound: alert.sound || 'critical',
        title: alert.title,
        body: alert.body,
        data: alert.data as unknown as Record<string, unknown>,
        priority: alert.priority || 'high',
      };

      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket.status === 'error') {
        this.logger.error(`Security alert failed to send: ${ticket.details?.error || 'Unknown error'}`);
        return false;
      }

      this.logger.info(`Security alert sent successfully`, {
        alertType,
        userType,
        token: token.substring(0, 10) + '...',
      });

      return true;
    } catch (error) {
      this.logger.error(`Error sending security alert: ${error.message}`);
      return false;
    }
  }

  /**
   * Send force logout notification specifically
   * @param token Expo push token
   * @param userType User type
   * @param metadata Additional metadata about the force logout
   */
  async sendForceLogoutNotification(
    token: string,
    userType: UserType,
    metadata?: {
      reason?: string;
      newDeviceId?: string;
      newDeviceInfo?: any;
      ipAddress?: string;
    },
  ): Promise<boolean> {
    return this.sendSecurityAlert(token, userType, 'FORCE_LOGOUT', {
      reason: metadata?.reason || 'new_device_login',
      deviceId: metadata?.newDeviceId,
      newDeviceInfo: metadata?.newDeviceInfo,
      ipAddress: metadata?.ipAddress,
    });
  }

  /**
   * Send device mismatch alert
   * @param token Expo push token
   * @param userType User type
   * @param metadata Device mismatch details
   */
  async sendDeviceMismatchAlert(
    token: string,
    userType: UserType,
    metadata?: {
      expectedDeviceId?: string;
      actualDeviceId?: string;
      ipAddress?: string;
    },
  ): Promise<boolean> {
    return this.sendSecurityAlert(token, userType, 'DEVICE_MISMATCH', {
      reason: 'device_id_mismatch',
      deviceId: metadata?.actualDeviceId,
      ipAddress: metadata?.ipAddress,
    });
  }

  /**
   * Send suspicious activity alert
   * @param token Expo push token
   * @param userType User type
   * @param metadata Suspicious activity details
   */
  async sendSuspiciousActivityAlert(
    token: string,
    userType: UserType,
    metadata?: {
      activityType?: string;
      deviceId?: string;
      ipAddress?: string;
      details?: any;
    },
  ): Promise<boolean> {
    return this.sendSecurityAlert(token, userType, 'SUSPICIOUS_ACTIVITY', {
      reason: metadata?.activityType || 'unknown_activity',
      deviceId: metadata?.deviceId,
      ipAddress: metadata?.ipAddress,
    });
  }

  /**
   * Send session expired notification
   * @param token Expo push token
   * @param userType User type
   * @param metadata Session expiration details
   */
  async sendSessionExpiredNotification(
    token: string,
    userType: UserType,
    metadata?: {
      reason?: string;
      deviceId?: string;
    },
  ): Promise<boolean> {
    return this.sendSecurityAlert(token, userType, 'SESSION_EXPIRED', {
      reason: metadata?.reason || 'token_expired',
      deviceId: metadata?.deviceId,
    });
  }
}
