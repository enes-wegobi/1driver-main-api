export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  services: {
    users: {
      url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.USERS_SERVICE_TIMEOUT || '5000', 10),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
});
