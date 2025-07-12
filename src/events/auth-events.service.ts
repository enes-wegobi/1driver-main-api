import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ForceLogoutRequestedEvent,
  ForceLogoutCompletedEvent,
  SuspiciousActivityDetectedEvent,
  WebSocketLogoutEvent,
  PushNotificationLogoutEvent,
  SessionLogEvent,
} from './types/auth-events.types';

export const AUTH_EVENTS = {
  FORCE_LOGOUT_REQUESTED: 'auth.forceLogout.requested',
  FORCE_LOGOUT_COMPLETED: 'auth.forceLogout.completed',
  SUSPICIOUS_ACTIVITY_DETECTED: 'auth.suspicious.detected',
  WEBSOCKET_LOGOUT: 'auth.websocket.logout',
  PUSH_NOTIFICATION_LOGOUT: 'auth.push.logout',
  SESSION_LOG: 'auth.session.log',
} as const;

@Injectable()
export class AuthEventsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitForceLogoutRequested(event: ForceLogoutRequestedEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.FORCE_LOGOUT_REQUESTED, event);
  }

  emitForceLogoutCompleted(event: ForceLogoutCompletedEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.FORCE_LOGOUT_COMPLETED, event);
  }

  emitSuspiciousActivityDetected(event: SuspiciousActivityDetectedEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.SUSPICIOUS_ACTIVITY_DETECTED, event);
  }

  emitWebSocketLogout(event: WebSocketLogoutEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.WEBSOCKET_LOGOUT, event);
  }

  emitPushNotificationLogout(event: PushNotificationLogoutEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.PUSH_NOTIFICATION_LOGOUT, event);
  }

  emitSessionLog(event: SessionLogEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.SESSION_LOG, event);
  }
}