import { Injectable } from '@nestjs/common';
import { OnEvent, EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from 'src/logger/logger.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { WebSocketService } from 'src/websocket/websocket.service';
import { AUTH_EVENTS } from '../auth-events.service';
import {
  ForceLogoutRequestedEvent,
  WebSocketLogoutEvent,
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
  }

  @OnEvent(AUTH_EVENTS.WEBSOCKET_LOGOUT)
  async handleWebSocketLogout(event: WebSocketLogoutEvent): Promise<void> {
    try {
      const success = await this.websocketService.forceLogoutUser(
        event.userId,
        event.userType,
        event.reason,
        {
          timestamp: event.timestamp.toISOString(),
          newDeviceId: event.sessionInfo?.newDeviceId,
        },
      );

      if (success) {
        this.logger.info('WebSocket force logout notification sent successfully', {
          userId: event.userId,
          userType: event.userType,
          reason: event.reason,
        });
      } else {
        this.logger.warn('WebSocket force logout notification failed - no active connection', {
          userId: event.userId,
          userType: event.userType,
          reason: event.reason,
        });
      }
    } catch (error) {
      this.logger.error('Error sending WebSocket force logout notification', {
        userId: event.userId,
        userType: event.userType,
        reason: event.reason,
        error: error.message,
      });
    }
  }

  @OnEvent(AUTH_EVENTS.MANUAL_LOGOUT)
  async handleManualLogout(event: WebSocketLogoutEvent): Promise<void> {
    try {
      const success = await this.websocketService.forceLogoutUser(
        event.userId,
        event.userType,
        event.reason,
        {
          timestamp: event.timestamp.toISOString(),
        },
      );

      if (success) {
        this.logger.info('Manual WebSocket logout completed successfully', {
          userId: event.userId,
          userType: event.userType,
          reason: event.reason,
        });
      } else {
        this.logger.warn('Manual WebSocket logout failed - no active connection', {
          userId: event.userId,
          userType: event.userType,
          reason: event.reason,
        });
      }
    } catch (error) {
      this.logger.error('Error during manual WebSocket logout', {
        userId: event.userId,
        userType: event.userType,
        reason: event.reason,
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

}