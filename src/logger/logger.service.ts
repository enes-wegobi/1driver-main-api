import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DatadogWinston from 'datadog-winston';
import { v4 as uuidv4 } from 'uuid';

export interface SimpleLogContext {
  requestId?: string;
  userId?: string;
  userType?: 'customer' | 'driver';
  tripId?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  [key: string]: any;
}

@Injectable()
export class LoggerService {
  private logger: winston.Logger;
  private readonly isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    transports.push(
      new winston.transports.Console({
        format: this.isDevelopment
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.simple(),
            )
          : winston.format.json(),
      }),
    );

    // DataDog transport for production
    if (
      this.configService.get('datadog.enabled') &&
      this.configService.get('datadog.apiKey')
    ) {
      transports.push(
        new DatadogWinston({
          apiKey: this.configService.get('datadog.apiKey'),
          hostname: this.configService.get('datadog.hostname'),
          service: this.configService.get('datadog.service'),
          ddsource: 'nodejs',
          ddtags: `env:${this.configService.get('datadog.env')},service:${this.configService.get('datadog.service')}`,
        }),
      );
    }

    return winston.createLogger({
      level: this.configService.get('logging.level', 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
      transports,
    });
  }

  // Request ID generator
  generateRequestId(): string {
    return uuidv4();
  }

  // Basic logging methods
  info(message: string, context?: SimpleLogContext): void {
    this.logger.info(message, context);
  }

  error(message: string, context?: SimpleLogContext): void {
    this.logger.error(message, context);
  }

  warn(message: string, context?: SimpleLogContext): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: SimpleLogContext): void {
    this.logger.debug(message, context);
  }

  // HTTP Request logging
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: SimpleLogContext,
  ): void {
    const logContext = {
      method,
      url,
      statusCode,
      duration,
      ...context,
    };

    if (statusCode >= 400) {
      this.error(
        `${method} ${url} - ${statusCode} (${duration}ms)`,
        logContext,
      );
    } else {
      this.info(`${method} ${url} - ${statusCode} (${duration}ms)`, logContext);
    }
  }

  // Service call logging (for external services)
  logServiceCall(
    serviceName: string,
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestId: string,
  ): void {
    this.info(`External Service Call: ${serviceName}`, {
      requestId,
      serviceName,
      method,
      url,
      statusCode,
      duration,
      type: 'external_service_call',
    });
  }

  // Business event logging
  logBusinessEvent(event: string, context?: SimpleLogContext): void {
    this.info(`Business Event: ${event}`, {
      ...context,
      type: 'business_event',
      event,
    });
  }

  // Error with stack trace
  logError(error: Error, context?: SimpleLogContext): void {
    this.error(error.message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }
}
