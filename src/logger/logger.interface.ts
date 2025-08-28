export interface LogContext {
  userId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  sessionId?: string;
  userType?: 'customer' | 'driver';
  tripId?: string;
  driverId?: string;
  customerId?: string;
  action?: string;
  resource?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: Error | string;
  metadata?: Record<string, any>;
  category?: string;
  operation?: string;
}

export interface LogMessage {
  message: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  context?: LogContext;
  timestamp?: Date;
  service?: string;
  category?: string;
}

export enum LogCategory {
  AUTH = 'auth',
  TRIP = 'trip',
  PAYMENT = 'payment',
  WEBSOCKET = 'websocket',
  QUEUE = 'queue',
  DATABASE = 'database',
  EXTERNAL_API = 'external-api',
  REDIS = 'redis',
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}
