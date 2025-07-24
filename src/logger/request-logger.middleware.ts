import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const logger = this.loggerService;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logContext = {
        requestId: logger.generateRequestId(),
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          deviceId: req.get('x-device-id'),
          platform: req.get('x-platform'),
        };

      logger.logRequest(
        req.method,
        req.originalUrl,
        res.statusCode,
        duration,
        logContext,
      );
    });

    next();
  }
}
