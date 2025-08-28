import { EventType } from '../enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';

export interface PendingEvent {
  id: string;
  userId: string;
  userType: UserType;
  eventType: EventType;
  data: any;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  requiresAck: boolean;
  tripId?: string; // Trip ID eklendi
}

export interface EventDeliveryResult {
  success: boolean;
  eventId: string;
  deliveryMethod: 'websocket' | 'push';
  acknowledged: boolean;
  error?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelays: number[]; // milliseconds
  fallbackToPush: boolean;
}

export interface EventAckPayload {
  eventId: string;
  timestamp?: Date;
}

export interface PendingEventsResponse {
  userId: string;
  events: PendingEvent[];
  totalCount: number;
}
