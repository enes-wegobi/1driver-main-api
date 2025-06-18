import { EventType } from '../enum/event-type.enum';
import { TripStatus } from 'src/common/enums/trip-status.enum';

/**
 * Event'lerin hangi trip status'larında relevant olduğunu belirler
 */
export const EVENT_TRIP_STATUS_MAPPING = {
  [EventType.TRIP_REQUESTED]: [TripStatus.DRAFT, TripStatus.WAITING_FOR_DRIVER],
  [EventType.TRIP_DRIVER_ASSIGNED]: [TripStatus.APPROVED],
  [EventType.TRIP_DRIVER_EN_ROUTE]: [TripStatus.DRIVER_ON_WAY_TO_PICKUP],
  [EventType.TRIP_DRIVER_ARRIVED]: [TripStatus.ARRIVED_AT_PICKUP],
  [EventType.TRIP_STARTED]: [TripStatus.TRIP_IN_PROGRESS],
  [EventType.TRIP_PAYMENT_REQUIRED]: [TripStatus.PAYMENT, TripStatus.PAYMENT_RETRY],
  [EventType.TRIP_PAYMENT_SUCCESS]: [TripStatus.COMPLETED],
  [EventType.TRIP_COMPLETED]: [TripStatus.COMPLETED],
  [EventType.TRIP_CANCELLED]: [TripStatus.CANCELLED],
  [EventType.TRIP_DRIVER_NOT_FOUND]: [TripStatus.DRIVER_NOT_FOUND],
  [EventType.TRIP_ALREADY_TAKEN]: [TripStatus.WAITING_FOR_DRIVER],
  [EventType.TRIP_REJECTED]: [TripStatus.WAITING_FOR_DRIVER],
};

/**
 * Trip Status hiyerarşisi - hangi status hangi seviyede
 */
export const TRIP_STATUS_HIERARCHY = {
  [TripStatus.DRAFT]: 0,
  [TripStatus.WAITING_FOR_DRIVER]: 1,
  [TripStatus.DRIVER_NOT_FOUND]: 2,
  [TripStatus.APPROVED]: 3,
  [TripStatus.DRIVER_ON_WAY_TO_PICKUP]: 4,
  [TripStatus.ARRIVED_AT_PICKUP]: 5,
  [TripStatus.TRIP_IN_PROGRESS]: 6,
  [TripStatus.PAYMENT]: 7,
  [TripStatus.PAYMENT_RETRY]: 7, // Same level as PAYMENT
  [TripStatus.COMPLETED]: 8,
  [TripStatus.CANCELLED]: 9,
  [TripStatus.CANCELLED_PAYMENT]: 9, // Same level as CANCELLED
};

/**
 * Event'in hala relevant olup olmadığını kontrol eder
 */
export function isEventStillRelevant(
  currentTripStatus: TripStatus,
  eventType: EventType,
): boolean {
  const expectedStatuses = EVENT_TRIP_STATUS_MAPPING[eventType];
  
  if (!expectedStatuses) {
    // Mapping'de yoksa (driver location update gibi) her zaman relevant
    return true;
  }

  const currentLevel = TRIP_STATUS_HIERARCHY[currentTripStatus];
  
  // Event'in expected status'larından herhangi biri current level'dan büyük veya eşitse relevant
  for (const expectedStatus of expectedStatuses) {
    const expectedLevel = TRIP_STATUS_HIERARCHY[expectedStatus];
    if (currentLevel <= expectedLevel) {
      return true;
    }
  }
  
  return false;
}
