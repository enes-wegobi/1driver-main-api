/**
 * Enum defining standardized event types used across the application
 * These event types are used for both WebSocket events and Expo push notifications
 */
export enum EventType {
  // Trip related events
  TRIP_REQUEST = 'trip:request',
  TRIP_ACCEPTED = 'trip:accepted',
  TRIP_ALREADY_TAKEN = 'trip:already_taken',
  TRIP_REJECTED = 'trip:rejected',
  TRIP_CANCELED = 'trip:canceled',
  TRIP_COMPLETED = 'trip:completed',
  TRIP_STARTED = 'trip:started',
  TRIP_ARRIVED = 'trip:arrived',

  // Driver related events
  DRIVER_LOCATION_UPDATED = 'driver:location_updated',
  DRIVER_STATUS_CHANGED = 'driver:status_changed',

  // Customer related events
  CUSTOMER_LOCATION_UPDATED = 'customer:location_updated',

  // System events
  NOTIFICATION = 'notification',
  ERROR = 'error',
}
