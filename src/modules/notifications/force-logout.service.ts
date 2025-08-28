/*import { Injectable, Logger } from '@nestjs/common';
import { WebSocketService } from '../../websocket/websocket.service';
import { ExpoNotificationsService } from '../expo-notifications/expo-notifications.service';
import { UserType } from '../../common/user-type.enum';

export interface ForceLogoutNotificationData {
  title: string;
  body: string;
  data: {
    type: 'FORCE_LOGOUT';
    reason: string;
    timestamp: number;
  };
}

@Injectable()
export class ForceLogoutService {
  private readonly logger = new Logger(ForceLogoutService.name);

  constructor(
    private readonly websocketService: WebSocketService,
    private readonly expoNotificationsService: ExpoNotificationsService,
  ) {}

  async executeForceLogout(
    oldDeviceId: string,
    userId: string,
    userType: UserType,
    reason: string = 'new_device_login',
  ): Promise<void> {
    try {
      this.logger.log(`Executing force logout for user ${userId}, device ${oldDeviceId}`);

      // 1. WebSocket force disconnect
      await this.websocketService.forceLogoutDevice(oldDeviceId, reason);

      // 2. Push notification gönder
      await this.sendForceLogoutNotification(oldDeviceId, userId, userType, reason);

      // 3. Log the event
      this.logger.warn('FORCE_LOGOUT_EXECUTED', {
        userId,
        userType,
        oldDeviceId,
        reason,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error('Failed to execute force logout', {
        userId,
        userType,
        oldDeviceId,
        reason,
        error: error.message,
      });
      throw error;
    }
  }

  private async sendForceLogoutNotification(
    deviceId: string,
    userId: string,
    userType: UserType,
    reason: string,
  ): Promise<void> {
    try {
      const notificationData: ForceLogoutNotificationData = {
        title: 'Oturum Sonlandırıldı',
        body: 'Hesabınız başka bir cihazdan açıldı.',
        data: {
          type: 'FORCE_LOGOUT',
          reason,
          timestamp: Date.now(),
        },
      };

      // Expo push notification gönder
      await this.expoNotificationsService.sendNotificationToDevice(
        deviceId,
        notificationData.title,
        notificationData.body,
        notificationData.data,
      );

      this.logger.log(`Force logout notification sent to device ${deviceId}`);

    } catch (error) {
      this.logger.error('Failed to send force logout notification', {
        deviceId,
        userId,
        userType,
        reason,
        error: error.message,
      });
      // Don't throw - notification failure shouldn't block force logout
    }
  }

  async sendSecurityAlert(
    userId: string,
    userType: UserType,
    alertType: 'SUSPICIOUS_LOGIN' | 'DEVICE_MISMATCH' | 'TOKEN_THEFT',
    details: Record<string, any>,
  ): Promise<void> {
    try {
      const alertMessages = {
        SUSPICIOUS_LOGIN: {
          title: 'Şüpheli Giriş Denemesi',
          body: 'Hesabınızda şüpheli bir giriş denemesi tespit edildi.',
        },
        DEVICE_MISMATCH: {
          title: 'Güvenlik Uyarısı',
          body: 'Hesabınızda yetkisiz erişim denemesi tespit edildi.',
        },
        TOKEN_THEFT: {
          title: 'Güvenlik İhlali',
          body: 'Hesabınızda güvenlik ihlali tespit edildi. Lütfen şifrenizi değiştirin.',
        },
      };

      const message = alertMessages[alertType];
      
      // User'ın aktif cihazına bildirim gönder
      await this.expoNotificationsService.sendNotificationToUser(
        userId,
        userType,
        message.title,
        message.body,
        {
          type: 'SECURITY_ALERT',
          alertType,
          details,
          timestamp: Date.now(),
        },
      );

      this.logger.warn('SECURITY_ALERT_SENT', {
        userId,
        userType,
        alertType,
        details,
        timestamp: Date.now(),
      });

    } catch (error) {
      this.logger.error('Failed to send security alert', {
        userId,
        userType,
        alertType,
        details,
        error: error.message,
      });
    }
  }
}
*/
