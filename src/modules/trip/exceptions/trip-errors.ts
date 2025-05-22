export const TripErrors = {
  TRIP_LOCKED: {
    code: 'T101',
    message:
      'Bu trip şu anda başka bir işlem tarafından kullanılıyor. Lütfen daha sonra tekrar deneyin.',
  },
  LOCK_ACQUISITION_FAILED: {
    code: 'T102',
    message: 'İşlem kilidi alınamadı. Lütfen daha sonra tekrar deneyin.',
  },
  TRIP_INVALID_STATUS: {
    code: 'T103',
    message: 'Trip geçersiz durumda, bu işlem gerçekleştirilemez.',
  },
  TRIP_NOT_FOUND: {
    code: 'T104',
    message: 'Trip bulunamadı.',
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
