import {
  Injectable,
  ExecutionContext,
  CanActivate,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from './jwt.service';
import { TokenManagerService } from '../redis/services/token-manager.service';
import { AUTH_EVENTS } from '../events/auth-events.service';
import { UserType } from '../common/user-type.enum';

@Injectable()
export class LogoutGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenManagerService: TokenManagerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Validate the token
    const payload = await this.jwtService.validateToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Add user to request
    request['user'] = payload;

    // Emit manual logout event
    this.eventEmitter.emit(AUTH_EVENTS.MANUAL_LOGOUT, {
      userId: payload.userId,
      userType: payload.userType as UserType,
      deviceId: '',
      reason: 'manual_logout',
      timestamp: new Date(),
    });

    // Invalidate active token
    await this.tokenManagerService.invalidateToken(
      payload.userId,
      payload.userType,
    );

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
