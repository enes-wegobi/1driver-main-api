import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from 'src/logger/logger.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { AUTH_EVENTS } from '../auth-events.service';
import {
  ForceLogoutRequestedEvent,
  WebSocketLogoutEvent,
  PushNotificationLogoutEvent,
} from '../types/auth-events.types';

@Injectable()
export class AuthEventsHandler {
  constructor(
    private readonly logger: LoggerService,
    private readonly expoNotifications: ExpoNotificationsService,
    private readonly websocketService: WebSocketService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(AUTH_EVENTS.FORCE_LOGOUT_REQUESTED)
  async handleForceLogoutRequested(event: ForceLogoutRequestedEvent): Promise<void> {
    this.logger.warn(
      `Force logout initiated for user ${event.userId} (${event.userType}): ${event.oldDeviceId} → ${event.newDeviceId}`,
      {
        userId: event.userId,
        userType: event.userType,
        oldDeviceId: event.oldDeviceId,
        newDeviceId: event.newDeviceId,
        reason: event.reason,
        ipAddress: event.metadata?.ipAddress,
      },
    );

    // Emit individual events for each action
    this.emitWebSocketLogout(event);
    this.emitPushNotificationLogout(event);
  }

  @OnEvent(AUTH_EVENTS.WEBSOCKET_LOGOUT)
  async handleWebSocketLogout(event: WebSocketLogoutEvent): Promise<void> {
    try {
      const success = await this.websocketService.forceLogoutDevice(
        event.deviceId,
        event.reason,
        {
          userId: event.userId,
          userType: event.userType,
          timestamp: event.timestamp.toISOString(),
          newDeviceId: event.sessionInfo?.newDeviceId,
        },
      );

      if (success) {
        this.logger.info('WebSocket force logout notification sent successfully', {
          userId: event.userId,
          userType: event.userType,
          deviceId: event.deviceId,
          reason: event.reason,
        });
      } else {
        this.logger.warn('WebSocket force logout notification failed - no active connections', {
          userId: event.userId,
          userType: event.userType,
          deviceId: event.deviceId,
          reason: event.reason,
        });
      }
    } catch (error) {
      this.logger.error('Error sending WebSocket force logout notification', {
        userId: event.userId,
        userType: event.userType,
        deviceId: event.deviceId,
        reason: event.reason,
        error: error.message,
      });
    }
  }

  @OnEvent(AUTH_EVENTS.PUSH_NOTIFICATION_LOGOUT)
  async handlePushNotificationLogout(event: PushNotificationLogoutEvent): Promise<void> {
    try {
      const expoToken = event.metadata?.expoToken || event.metadata?.oldSessionInfo?.expoToken;
      
      if (!expoToken) {
        this.logger.warn('No Expo token available for force logout notification', {
          userId: event.userId,
          userType: event.userType,
          deviceId: event.deviceId,
        });
        return;
      }

      const success = await this.expoNotifications.sendForceLogoutNotification(
        expoToken,
        event.userType,
        {
          reason: event.reason,
          newDeviceId: event.deviceId,
          ipAddress: event.metadata?.ipAddress,
        },
      );

      if (success) {
        this.logger.info('Force logout push notification sent successfully', {
          userId: event.userId,
          userType: event.userType,
          deviceId: event.deviceId,
          reason: event.reason,
        });
      } else {
        this.logger.warn('Failed to send force logout push notification', {
          userId: event.userId,
          userType: event.userType,
          deviceId: event.deviceId,
          reason: event.reason,
        });
      }
    } catch (error) {
      this.logger.error('Error sending force logout push notification', {
        userId: event.userId,
        userType: event.userType,
        deviceId: event.deviceId,
        error: error.message,
      });
    }
  }


  private emitWebSocketLogout(event: ForceLogoutRequestedEvent): void {
    const webSocketEvent: WebSocketLogoutEvent = {
      userId: event.userId,
      userType: event.userType,
      deviceId: event.oldDeviceId,
      reason: event.reason,
      sessionInfo: event.metadata?.oldSessionInfo,
      timestamp: event.timestamp,
    };
    
    this.eventEmitter.emit(AUTH_EVENTS.WEBSOCKET_LOGOUT, webSocketEvent);
  }

  private emitPushNotificationLogout(event: ForceLogoutRequestedEvent): void {
    const pushNotificationEvent: PushNotificationLogoutEvent = {
      userId: event.userId,
      userType: event.userType,
      deviceId: event.oldDeviceId,
      reason: event.reason,
      metadata: event.metadata,
      timestamp: event.timestamp,
    };
    
    this.eventEmitter.emit(AUTH_EVENTS.PUSH_NOTIFICATION_LOGOUT, pushNotificationEvent);
  }
}