export const TripErrors = {
  TRIP_LOCKED: {
    code: 'T101',
    message:
      'Trip is currently being processed by another request. Please try again later.',
  },
  LOCK_ACQUISITION_FAILED: {
    code: 'T102',
    message: 'Failed to acquire operation lock. Please try again later.',
  },
  TRIP_INVALID_STATUS: {
    code: 'T103',
    message:
      'Trip is in an invalid status, this operation cannot be performed.',
  },
  TRIP_NOT_FOUND: {
    code: 'T104',
    message: 'Trip not found.',
  },
};
