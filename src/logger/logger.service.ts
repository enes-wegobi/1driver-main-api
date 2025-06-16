import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DatadogWinston from 'datadog-winston';
import * as moment from 'moment';
import {
  LogContext,
  LogMessage,
  LogCategory,
  LogLevel,
} from './logger.interface';

@Injectable()
export class LoggerService {
  private logger: winston.Logger;
  private readonly isDevelopment: boolean;
  private readonly isProduction: boolean;
  private readonly datadogEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.isProduction = this.configService.get('NODE_ENV') === 'production';
    this.datadogEnabled = this.configService.get('datadog.enabled', false);

    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];
    const logLevel = this.configService.get('logging.level', 'info');

    // Console transport - always enabled
    transports.push(
      new winston.transports.Console({
        level: logLevel,
        format: this.isDevelopment
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  const metaStr = Object.keys(meta).length
                    ? JSON.stringify(meta, null, 2)
                    : '';
                  return `${timestamp} [${level}]: ${message} ${metaStr}`;
                },
              ),
            )
          : winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
      }),
    );

    // File transport for development
    if (this.isDevelopment) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );
    }

    // DataDog transport for production
    if (this.datadogEnabled && this.configService.get('datadog.apiKey')) {
      transports.push(
        new DatadogWinston({
          apiKey: this.configService.get('datadog.apiKey'),
          hostname: this.configService.get('datadog.hostname'),
          service: this.configService.get('datadog.service'),
          ddsource: 'nodejs',
          ddtags: this.buildDatadogTags(),
          level: this.configService.get('datadog.logLevel', 'info'),
        }),
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: {
        service: this.configService.get(
          'datadog.service',
          'customer-api-gateway',
        ),
        environment: this.configService.get('datadog.env', 'development'),
        version: this.configService.get('datadog.version', '1.0.0'),
      },
      transports,
    });
  }

  private buildDatadogTags(): string {
    const baseTags = [
      `env:${this.configService.get('datadog.env', 'development')}`,
      `service:${this.configService.get('datadog.service', 'customer-api-gateway')}`,
      `version:${this.configService.get('datadog.version', '1.0.0')}`,
    ];

    const customTags = this.configService.get('datadog.tags', '');
    if (customTags) {
      baseTags.push(...customTags.split(',').map((tag) => tag.trim()));
    }

    return baseTags.join(',');
  }

  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };

    // Remove sensitive information
    if (sanitized.metadata) {
      const { password, token, apiKey, secret, ...safeMeta } =
        sanitized.metadata;
      sanitized.metadata = safeMeta;
    }

    return sanitized;
  }

  private formatMessage(message: string, context?: LogContext): any {
    const sanitizedContext = context ? this.sanitizeContext(context) : {};

    return {
      message,
      timestamp: moment().toISOString(),
      ...sanitizedContext,
      // Add DataDog trace correlation if available
      dd: this.getDatadogTraceInfo(),
    };
  }

  private getDatadogTraceInfo(): any {
    try {
      const tracer = require('dd-trace');
      const span = tracer.scope().active();
      if (span) {
        return {
          trace_id: span.context().toTraceId(),
          span_id: span.context().toSpanId(),
        };
      }
    } catch (error) {
      // dd-trace not available or no active span
    }
    return {};
  }

  // Main logging methods
  error(message: string, context?: LogContext): void {
    this.logger.error(this.formatMessage(message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.formatMessage(message, context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.formatMessage(message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.formatMessage(message, context));
  }

  // Category-specific logging methods
  logAuth(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.AUTH });
  }

  logTrip(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.TRIP });
  }

  logPayment(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.PAYMENT });
  }

  logWebSocket(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.WEBSOCKET });
  }

  logQueue(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.QUEUE });
  }

  logDatabase(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.DATABASE });
  }

  logExternalAPI(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.EXTERNAL_API });
  }

  logRedis(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.REDIS });
  }

  logSystem(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.SYSTEM });
  }

  logSecurity(message: string, context?: LogContext): void {
    this.warn(message, { ...context, category: LogCategory.SECURITY });
  }

  logPerformance(message: string, context?: LogContext): void {
    this.info(message, { ...context, category: LogCategory.PERFORMANCE });
  }

  // HTTP Request logging
  logHttpRequest(req: any, res: any, duration: number): void {
    const context: LogContext = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      userType: req.user?.type,
      requestId: req.id,
    };

    if (res.statusCode >= 400) {
      this.error(`HTTP ${req.method} ${req.url} - ${res.statusCode}`, context);
    } else {
      this.info(`HTTP ${req.method} ${req.url} - ${res.statusCode}`, context);
    }
  }

  // Error logging with stack trace
  logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  // Performance monitoring
  logPerformanceMetric(
    operation: string,
    duration: number,
    context?: LogContext,
  ): void {
    this.logPerformance(`${operation} completed in ${duration}ms`, {
      ...context,
      duration,
      operation,
    });
  }

  // Business logic logging
  logBusinessEvent(event: string, context?: LogContext): void {
    this.info(`Business Event: ${event}`, context);
  }
}
