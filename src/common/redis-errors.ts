export const RedisErrors = {
  NO_DRIVERS_FOUND: {
    code: 'R101',
    message: 'No available drivers found in the area.',
  },
  INVALID_REQUEST: {
    code: 'T101',
    message:
      'Invalid request. At least one origin and one destination point is required.',
  },
  PAYMENT_NOT_FOUND: {
    code: 'P101',
    message: 'You must add a payment method before requesting a driver',
  },
  // Other trip-related errors can be added here
};
