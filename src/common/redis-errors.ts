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
  // Other trip-related errors can be added here
};
