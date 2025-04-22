export enum TripStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  DRIVER_ARRIVED = 'DRIVER_ARRIVED',
  TRIP_STARTED = 'TRIP_STARTED',
  TRIP_COMPLETED = 'TRIP_COMPLETED',
  CANCELLED = 'CANCELLED',
}

export const TripStatusMessages = {
  [TripStatus.REQUESTED]: 'Trip requested',
  [TripStatus.ACCEPTED]: 'Trip accepted by driver',
  [TripStatus.DRIVER_ARRIVED]: 'Driver has arrived at pickup location',
  [TripStatus.TRIP_STARTED]: 'Trip has started',
  [TripStatus.TRIP_COMPLETED]: 'Trip completed successfully',
  [TripStatus.CANCELLED]: 'Trip was cancelled',
};

export const TripStatusFlow: Record<TripStatus, TripStatus[]> = {
  [TripStatus.REQUESTED]: [TripStatus.ACCEPTED, TripStatus.CANCELLED],
  [TripStatus.ACCEPTED]: [TripStatus.DRIVER_ARRIVED, TripStatus.CANCELLED],
  [TripStatus.DRIVER_ARRIVED]: [TripStatus.TRIP_STARTED, TripStatus.CANCELLED],
  [TripStatus.TRIP_STARTED]: [TripStatus.TRIP_COMPLETED, TripStatus.CANCELLED],
  [TripStatus.TRIP_COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
};

export function isValidStatusTransition(
  currentStatus: TripStatus,
  newStatus: TripStatus,
): boolean {
  return TripStatusFlow[currentStatus]?.includes(newStatus) || false;
}
