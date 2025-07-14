import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ForceLogoutRequestedEvent,
  ForceLogoutCompletedEvent,
  WebSocketLogoutEvent,
} from './types/auth-events.types';

export const AUTH_EVENTS = {
  FORCE_LOGOUT_REQUESTED: 'auth.forceLogout.requested',
  FORCE_LOGOUT_COMPLETED: 'auth.forceLogout.completed',
  WEBSOCKET_LOGOUT: 'auth.websocket.logout',
  MANUAL_LOGOUT: 'auth.manual.logout',
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

  emitWebSocketLogout(event: WebSocketLogoutEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.WEBSOCKET_LOGOUT, event);
  }

  emitManualLogout(event: WebSocketLogoutEvent): void {
    this.eventEmitter.emit(AUTH_EVENTS.MANUAL_LOGOUT, event);
  }

}