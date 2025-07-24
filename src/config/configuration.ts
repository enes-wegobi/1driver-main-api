import { SecretsService } from './secrets.service';

const secretsService = new SecretsService();

export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  googleMapsApiKey: secretsService.readSecret(
    'google_maps_api_key',
    'GOOGLE_MAPS_API_KEY',
  ),
  stripe: {
    secretKey: secretsService.readSecret(
      'stripe_secret_key',
      'STRIPE_SECRET_KEY',
    ),
    webhookSecret: secretsService.readSecret(
      'stripe_webhook_secret',
      'STRIPE_WEBHOOK_SECRET',
    ),
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
    secret: secretsService.readSecretWithDefault(
      'jwt_secret',
      'supersecret',
      'JWT_SECRET',
    ),
    expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '2592000', 10),
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
    password: secretsService.readSecretWithDefault(
      'valkey_password',
      '',
      'VALKEY_PASSWORD',
    ),
    tls: process.env.VALKEY_TLS === 'true',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    fileEnabled: process.env.LOGGING_FILE_ENABLED !== 'false',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    errorMaxFiles: process.env.LOG_ERROR_MAX_FILES || '30d',
  },
  sentry: {
    dsn: secretsService.readSecret('sentry_dsn', 'SENTRY_DSN'),
    environment: process.env.NODE_ENV || 'development',
    release:
      process.env.SENTRY_RELEASE || process.env.DATADOG_VERSION || '1.0.0',
    serverName:
      process.env.SENTRY_SERVER_NAME ||
      process.env.DATADOG_HOSTNAME ||
      require('os').hostname(),
    service:
      process.env.SENTRY_SERVICE ||
      process.env.DATADOG_SERVICE ||
      '1driver-main-api',
    tracesSampleRate: parseFloat(
      process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1',
    ),
    profilesSampleRate: parseFloat(
      process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1',
    ),
  },
  spaces: {
    region: process.env.SPACES_REGION,
    endpoint: process.env.SPACES_ENDPOINT,
    accessKeyId: secretsService.readSecret(
      'spaces_access_key_id',
      'SPACES_ACCESS_KEY_ID',
    ),
    secretAccessKey: secretsService.readSecret(
      'spaces_secret_access_key',
      'SPACES_SECRET_ACCESS_KEY',
    ),
    bucketName: process.env.SPACES_BUCKET_NAME,
    cdnEndpoint: process.env.SPACES_CDN_ENDPOINT,
  },
  trip: {
    mongoHost: process.env.TRIP_MONGODB_HOST,
    mongoUser: secretsService.readSecret(
      'trip_mongodb_user',
      'TRIP_MONGODB_USER',
    ),
    mongoPassword: secretsService.readSecret(
      'trip_mongodb_password',
      'TRIP_MONGODB_PASSWORD',
    ),
    mongoDatabase: process.env.TRIP_MONGODB_DATABASE,
    mongoUrl: secretsService.buildMongoURI(),
  },
  tripCostPerMinute: parseFloat(process.env.TRIP_COST_PER_MINUTE || '1'),
  driverEarnings: {
    perMinuteRate: parseFloat(process.env.DRIVER_EARNINGS_PER_MINUTE || '0.5'),
  },
  tripDriverResponseTimeout: parseInt(
    process.env.TRIP_DRIVER_RESPONSE_TIMEOUT || '20',
    20,
  ), // 10 seconds
  tripTimeoutCheckInterval: parseInt(
    process.env.TRIP_TIMEOUT_CHECK_INTERVAL || '30',
    10,
  ), // 30 seconds
  queue: {
    redis: {
      host:
        process.env.QUEUE_REDIS_HOST || process.env.VALKEY_HOST || 'localhost',
      port: parseInt(
        process.env.QUEUE_REDIS_PORT || process.env.VALKEY_PORT || '6379',
        10,
      ),
      username:
        process.env.QUEUE_REDIS_USERNAME || process.env.VALKEY_USERNAME || '',
      password:
        secretsService.readSecret(
          'queue_redis_password',
          'QUEUE_REDIS_PASSWORD',
        ) ||
        secretsService.readSecret('valkey_password', 'VALKEY_PASSWORD') ||
        '',
      db: parseInt(process.env.QUEUE_REDIS_DB || '1', 10), // Use separate DB for queues
      tls:
        process.env.QUEUE_REDIS_TLS === 'true' ||
        process.env.VALKEY_TLS === 'true',
    },
    defaultJobOptions: {
      removeOnComplete: parseInt(
        process.env.QUEUE_REMOVE_ON_COMPLETE || '100',
        10,
      ),
      removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL || '50', 10),
      attempts: parseInt(process.env.QUEUE_DEFAULT_ATTEMPTS || '3', 10),
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.QUEUE_BACKOFF_DELAY || '2000', 10),
      },
    },
  },
  expo: {
    accessToken: secretsService.readSecret(
      'expo_access_token',
      'EXPO_ACCESS_TOKEN',
    ),
  },
  sms: {
    apiKey: secretsService.readSecret('sms_api_key', 'SMS_API_KEY'),
    clientId: secretsService.readSecret('sms_client_id', 'SMS_CLIENT_ID'),
    baseUrl:
      process.env.SMS_BASE_URL || 'https://user.digitizebirdsms.com/api/v2',
    otpExpiryMinutes: parseInt(process.env.SMS_OTP_EXPIRY_MINUTES || '2', 10),
    senderId: process.env.SMS_SENDER_ID || 'DRIVER',
  },
});
