// Load environment variables FIRST
import { config } from 'dotenv';
config();

// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from "@sentry/nestjs"
import { nodeProfilingIntegration } from "@sentry/profiling-node";

// Debug: Log DSN to verify it's being read
console.log('🔍 Sentry DSN:', process.env.SENTRY_DSN ? `✅ Found: ${process.env.SENTRY_DSN}` : '❌ Not found');
console.log('🔍 NODE_ENV:', process.env.NODE_ENV);

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE || process.env.DATADOG_VERSION || '1.0.0',
  
  // Performance monitoring
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  
  // Profiling
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  integrations: [
    nodeProfilingIntegration(),
  ],
  
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
  
  // Enable structured logs (Beta feature)
  _experiments: { 
    enableLogs: true,
    beforeSendLog: (log) => {
      // Filter out debug logs in production
      if (log.level === 'debug' && process.env.NODE_ENV === 'production') {
        return null;
      }
      return log;
    },
  },
  
  // Error filtering
  beforeSend(event) {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === 'ValidationError' || error?.type === 'BadRequestException') {
        return null; // Don't send validation errors to Sentry
      }
    }
    return event;
  },
});