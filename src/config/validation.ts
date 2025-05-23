import { z } from 'zod';

const Environment = z.enum(['development', 'production', 'test']);

const envSchema = z.object({
  NODE_ENV: Environment.optional().default('development'),
  PORT: z.coerce.number().optional().default(3000),
  HOST: z.string().optional().default('0.0.0.0'),
  CORS_ORIGINS: z.string().optional().default('*'),
  USERS_SERVICE_URL: z.string().optional().default('http://localhost:3001'),
  USERS_SERVICE_TIMEOUT: z.coerce.number().optional().default(5000),
  AUTH_SERVICE_URL: z.string().optional().default('http://localhost:3001'),
  AUTH_SERVICE_TIMEOUT: z.coerce.number().optional().default(5000),
  PROMOTION_SERVICE_URL: z.string().optional().default('http://localhost:3002'),
  PROMOTION_SERVICE_TIMEOUT: z.coerce.number().optional().default(5000),
  JWT_SECRET: z.string().optional().default('supersecret'),
  JWT_EXPIRES_IN: z.coerce.number().optional().default(36000),
  SPACES_REGION: z.string().optional(),
  SPACES_ENDPOINT: z.string().optional(),
  SPACES_ACCESS_KEY_ID: z.string().optional(),
  SPACES_SECRET_ACCESS_KEY: z.string().optional(),
  SPACES_BUCKET_NAME: z.string().optional(),
  SPACES_CDN_ENDPOINT: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  VALKEY_HOST: z.string().optional().default('localhost'),
  VALKEY_PORT: z.coerce.number().int().positive().optional().default(6379),
  VALKEY_PASSWORD: z.string().optional(),
  VALKEY_USERNAME: z.string().optional(),
  VALKEY_TLS: z.string().optional().default('false'),
  TRIP_MONGODB_URI: z.string().url(),
  TRIP_MONGODB_USER: z.string().min(1),
  TRIP_MONGODB_PASSWORD: z.string().min(1),
  TRIP_COST_PER_MINUTE: z.coerce.number().positive().optional().default(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        'Config validation error:',
        JSON.stringify(error.format(), null, 2),
      );
      throw new Error('Configuration validation failed');
    }
    throw error;
  }
}
