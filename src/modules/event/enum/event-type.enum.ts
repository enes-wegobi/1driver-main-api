export enum EventType {
  TRIP_REQUESTED = 'trip:requested',
  TRIP_DRIVER_ASSIGNED = 'trip:driver_assigned',
  TRIP_ALREADY_TAKEN = 'trip:already_taken',
  TRIP_REJECTED = 'trip:rejected',
  TRIP_CANCELLED = 'trip:cancelled',
  TRIP_COMPLETED = 'trip:completed',
  TRIP_DRIVER_EN_ROUTE = 'trip:driver_en_route',
  TRIP_DRIVER_ARRIVED = 'trip:driver_arrived',
  TRIP_STARTED = 'trip:started',
  TRIP_DRIVER_NOT_FOUND = 'trip:driver_not_found',
  TRIP_PAYMENT_REQUIRED = 'trip:payment_required',
  TRIP_PAYMENT_STARTED = 'trip:payment_started',
  TRIP_PAYMENT_PROCESSING = 'trip:payment_processing',
  TRIP_PAYMENT_SUCCESS = 'trip:payment_success',
  TRIP_PAYMENT_FAILED = 'trip:payment_failed',
  TRIP_PAYMENT_RETRY = 'trip:payment_retry',

  // Driver related events
  DRIVER_LOCATION_UPDATED = 'driver:location_updated',
  DRIVER_STATUS_CHANGED = 'driver:status_changed',

  // Customer related events
  CUSTOMER_LOCATION_UPDATED = 'customer:location_updated',

  // System events
  NOTIFICATION = 'notification',
  ERROR = 'error',
}

// Critical events that require acknowledgment
export const CRITICAL_EVENTS: EventType[] = [
  EventType.TRIP_DRIVER_ASSIGNED,
  EventType.TRIP_STARTED,
  EventType.TRIP_COMPLETED,
  EventType.TRIP_CANCELLED,
  EventType.TRIP_DRIVER_ARRIVED,
  EventType.TRIP_DRIVER_EN_ROUTE,
  EventType.TRIP_PAYMENT_REQUIRED,
  EventType.TRIP_PAYMENT_SUCCESS,
  EventType.TRIP_PAYMENT_FAILED,
  EventType.TRIP_DRIVER_NOT_FOUND,
];

// Events that should be retried aggressively
export const HIGH_PRIORITY_EVENTS: EventType[] = [
  EventType.TRIP_DRIVER_ASSIGNED,
  EventType.TRIP_STARTED,
  EventType.TRIP_COMPLETED,
  EventType.TRIP_CANCELLED,
];

// Helper function to check if event is critical
export function isCriticalEvent(eventType: EventType): boolean {
  return CRITICAL_EVENTS.includes(eventType);
}

// Helper function to check if event is high priority
export function isHighPriorityEvent(eventType: EventType): boolean {
  return HIGH_PRIORITY_EVENTS.includes(eventType);
}
