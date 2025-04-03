import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from './jwt.service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);

  constructor(private jwtService: JwtService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = this.extractTokenFromHeader(req);
    
    if (token) {
      try {
        const payload = await this.jwtService.validateToken(token);
        if (payload) {
          // Assign user to request object
          req['user'] = payload;
        }
      } catch (error) {
        this.logger.warn(`Invalid JWT token: ${error.message}`);
      }
    }
    
    next();
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}