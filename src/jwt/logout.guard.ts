import {
  Injectable,
  ExecutionContext,
  CanActivate,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from './jwt.service';
import { TokenManagerService } from '../redis/services/token-manager.service';

@Injectable()
export class LogoutGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenManagerService: TokenManagerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    /*
    // Check if token is already blacklisted
    const isBlacklisted =
      await this.tokenManagerService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Validate the token
    const payload = await this.jwtService.validateToken(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Add user to request
    request['user'] = payload;

    // Decode token to get expiration
    const decoded = this.jwtService.decodeToken(token);
    if (!decoded || !decoded.exp) {
      throw new UnauthorizedException('Invalid token format');
    }

    // Blacklist token
    await this.tokenManagerService.blacklistToken(token, decoded.exp);

    // Invalidate active token
    await this.tokenManagerService.invalidateActiveToken(
      payload.userId,
      payload.userType,
    );
    */

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
