import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TestHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    req.headers['device-id'] = 'websocket-test-dashboard';
    req.headers['user-agent'] = 'iphone';
    req.headers['x-forwarded-for'] = '62.163.150.246';
    req.headers['x-real-ip'] = '62.163.150.246';
    
    next();
  }
}