import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from 'src/common/user-type.enum';
import * as Sentry from '@sentry/node';

export interface SimpleLogContext {
  requestId?: string;
  userId?: string;
  userType?: UserType;
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

    // File transports with rotation (if enabled)
    if (this.configService.get('logging.fileEnabled', true)) {
      // General application logs
      transports.push(
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: this.configService.get('logging.maxSize', '20m'),
          maxFiles: this.configService.get('logging.maxFiles', '14d'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      );

      // Error logs (separate file)
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: this.configService.get('logging.maxSize', '20m'),
          maxFiles: this.configService.get('logging.errorMaxFiles', '30d'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
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
    Sentry.logger.info(message, context);
  }

  error(message: string, context?: SimpleLogContext): void {
    this.logger.error(message, context);
    Sentry.logger.error(message, context);
  }

  warn(message: string, context?: SimpleLogContext): void {
    this.logger.warn(message, context);
    Sentry.logger.warn(message, context);
  }

  debug(message: string, context?: SimpleLogContext): void {
    this.logger.debug(message, context);
    Sentry.logger.debug(message, context);
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
    Sentry.captureException(error, {
      user: context?.userId ? { id: context.userId } : undefined,
      tags: {
        requestId: context?.requestId,
        userType: context?.userType,
        tripId: context?.tripId,
      },
      extra: context,
    });

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
