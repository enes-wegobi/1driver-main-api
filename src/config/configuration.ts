export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: '2025-04-30.basil', // Updated to match Stripe's expected version format
  },
  services: {
    users: {
      url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.USERS_SERVICE_TIMEOUT || '30000', 10), // Increased from 15000 to 30000
      retryCount: parseInt(process.env.USERS_SERVICE_RETRY_COUNT || '3', 10),
      retryDelay: parseInt(process.env.USERS_SERVICE_RETRY_DELAY || '1000', 10),
    },
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000', 10),
      retryCount: parseInt(process.env.AUTH_SERVICE_RETRY_COUNT || '3', 10),
      retryDelay: parseInt(process.env.AUTH_SERVICE_RETRY_DELAY || '1000', 10),
    },
    promotion: {
      url: process.env.PROMOTION_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.PROMOTION_SERVICE_TIMEOUT || '5000', 10),
      retryCount: parseInt(
        process.env.PROMOTION_SERVICE_RETRY_COUNT || '3',
        10,
      ),
      retryDelay: parseInt(
        process.env.PROMOTION_SERVICE_RETRY_DELAY || '1000',
        10,
      ),
    },
  },
  retry: {
    defaultCount: parseInt(process.env.DEFAULT_RETRY_COUNT || '3', 10),
    defaultDelay: parseInt(process.env.DEFAULT_RETRY_DELAY || '1000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret',
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '36000', 10),
  },
  redis: {
    driverLocationExpiry: parseInt(
      process.env.REDIS_DRIVER_LOCATION_EXPIRY || '900',
      10,
    ),
    activeDriverExpiry: parseInt(
      process.env.REDIS_ACTIVE_DRIVER_EXPIRY || '1800',
      10,
    ),
    activeCustomerExpiry: parseInt(
      process.env.REDIS_ACTIVE_CUSTOMER_EXPIRY || '1800',
      10,
    ),
  },
  valkey: {
    host: process.env.VALKEY_HOST || 'localhost',
    port: parseInt(process.env.VALKEY_PORT || '6379', 10),
    username: process.env.VALKEY_USERNAME || '',
    password: process.env.VALKEY_PASSWORD || '',
    tls: process.env.VALKEY_TLS === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  spaces: {
    region: process.env.SPACES_REGION,
    endpoint: process.env.SPACES_ENDPOINT,
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
    bucketName: process.env.SPACES_BUCKET_NAME,
    cdnEndpoint: process.env.SPACES_CDN_ENDPOINT,
  },
  trip: {
    mongoUser: process.env.TRIP_MONGODB_USER,
    mongoUrl: process.env.TRIP_MONGODB_URI,
    mongoPassword: process.env.TRIP_MONGODB_PASSWORD,
  },
  tripCostPerMinute: parseFloat(process.env.TRIP_COST_PER_MINUTE || '1'),
});
