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
    message: 'Trip is in an invalid status, this operation cannot be performed.',
  },
  TRIP_NOT_FOUND: {
    code: 'T104',
    message: 'Trip not found.',
  },
  /* example errors
  PROMOTION_CODE_EXISTS: {
    code: 'P101',
    message: 'Promotion with this code already exists.',
  },
  PROMOTION_NOT_FOUND: {
    code: 'P102',
    message: 'Promotion not found.',
  },
  PROMOTION_INACTIVE: {
    code: 'P103',
    message: 'This promotion is not active.',
  },
  PROMOTION_NOT_STARTED: {
    code: 'P104',
    message: 'This promotion has not started yet.',
  },
  PROMOTION_EXPIRED: {
    code: 'P105',
    message: 'This promotion has expired.',
  },
  PROMOTION_USAGE_LIMIT_REACHED: {
    code: 'P106',
    message: 'This promotion has reached its usage limit.',
  },
  USER_PROMOTION_USAGE_LIMIT_REACHED: {
    code: 'P107',
    message: 'You have reached the usage limit for this promotion.',
  },
  */
};
