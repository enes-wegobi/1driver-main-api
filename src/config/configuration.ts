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
    trip: {
      url: process.env.TRIP_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.TRIP_SERVICE_TIMEOUT || '50000', 10),
      retryCount: parseInt(process.env.TRIP_SERVICE_RETRY_COUNT || '3', 10),
      retryDelay: parseInt(process.env.TRIP_SERVICE_RETRY_DELAY || '1000', 10),
    },
  },
  retry: {
    defaultCount: parseInt(process.env.DEFAULT_RETRY_COUNT || '3', 10),
    defaultDelay: parseInt(process.env.DEFAULT_RETRY_DELAY || '1000', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
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
    cdnEndpoint: process.env.SPACES_CND_ENDPOINT,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
});
