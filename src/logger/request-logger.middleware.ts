import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private readonly loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const originalSend = res.send;

    res.send = function (data) {
       const logData = {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          deviceId: req.get('x-device-id'),
          platform: req.get('x-platform'),
        };

        this.loggerService.info(
          `Request failed: ${req.method} ${req.originalUrl}`,
          logData,
        );
      return originalSend.call(this, data);
    };

    next();
  }
}
