export enum EventType {
  TRIP_REQUESTED = 'trip:requested',             // TRIP_REQUEST = 'trip:request',
  TRIP_DRIVER_ASSIGNED = 'trip:driver_assigned', // TRIP_ACCEPTED = 'trip:accepted',
  TRIP_ALREADY_TAKEN = 'trip:already_taken',
  TRIP_REJECTED = 'trip:rejected',
  TRIP_CANCELLED = 'trip:cancelled',
  TRIP_COMPLETED = 'trip:completed',
  TRIP_DRIVER_EN_ROUTE = 'trip:driver_en_route',
  TRIP_DRIVER_ARRIVED = 'trip:driver_arrived',
  TRIP_STARTED = 'trip:started',
  TRIP_DRIVER_NOT_FOUND = 'trip:driver_not_found',

  // Driver related events
  DRIVER_LOCATION_UPDATED = 'driver:location_updated',
  DRIVER_STATUS_CHANGED = 'driver:status_changed',

  // Customer related events
  CUSTOMER_LOCATION_UPDATED = 'customer:location_updated',

  // System events
  NOTIFICATION = 'notification',
  ERROR = 'error',
}
