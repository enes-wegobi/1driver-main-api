import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from './logger.service';
import { randomUUID } from 'crypto';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = this.loggerService.generateRequestId() || randomUUID(); // Generate ID early

    (req as any).requestId = requestId;

    const requestData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      deviceId: req.headers['x-device-id'],
      platform: req.headers['x-platform'],
    };

    const logOnEnd = () => {
      const duration = Date.now() - startTime;
      const logContext = {
        requestId,
        ip: requestData.ip,
        userAgent: requestData.userAgent,
        deviceId: requestData.deviceId,
        platform: requestData.platform,
      };

      if (this.configService.isDevelopment || res.statusCode >= 400) {
        this.loggerService.logRequest(
          requestData.method,
          requestData.url,
          res.statusCode,
          duration,
          logContext,
        );
      }
    };

    res.on('finish', logOnEnd);
    res.on('close', logOnEnd);

    next();
  }
}