import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '../jwt.service';
import { TokenManagerService } from '../../redis/services/token-manager.service';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private tokenManagerService: TokenManagerService,
    private loggerService: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    const payload = await this.jwtService.validateToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Extract current device and session info
    const currentDeviceInfo = this.extractDeviceInfo(request);
    const currentIpAddress = this.extractIpAddress(request);

    try {
      const sessionMetadata = await this.tokenManagerService.getActiveToken(
        payload.userId,
        payload.userType,
      );

      if (sessionMetadata) {
        if (sessionMetadata.token && sessionMetadata.token !== token) {
          throw new UnauthorizedException('Token validation failed');
        }

        const isValidDevice = this.validateDeviceBinding(
          currentDeviceInfo,
          sessionMetadata,
        );

        if (!isValidDevice) {
          throw new UnauthorizedException('Device validation failed');
        }

        // Check for significant IP changes (optional security measure)
        if (
          sessionMetadata.ipAddress &&
          sessionMetadata.ipAddress !== currentIpAddress
        ) {
          await this.tokenManagerService.updateLastSeen(
            payload.userId,
            payload.userType,
            currentIpAddress,
          );
        } else {
          // Regular activity update
          await this.tokenManagerService.updateLastSeen(
            payload.userId,
            payload.userType,
          );
        }
      } else {
        // No session metadata found - this shouldn't happen for valid tokens
        this.loggerService.error('Session metadata not found for valid token', {
          userId: payload.userId,
          userType: payload.userType,
          deviceInfo: currentDeviceInfo,
          ipAddress: currentIpAddress,
        });

        throw new UnauthorizedException('Session validation failed');
      }
    } catch (error) {
      this.loggerService.error('JWT Guard validation error', {
        error: error.message,
        url: request.originalUrl,
        method: request.method,
        userId: payload.userId,
        userType: payload.userType,
        deviceInfo: currentDeviceInfo,
        ipAddress: currentIpAddress,
      });

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Session validation error');
    }

    request['user'] = payload;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private extractDeviceInfo(request: any): any {
    const deviceInfo = {
      userAgent: request.headers['user-agent'] || 'Unknown',
      platform: request.headers['x-platform'] || 'Unknown',
      appVersion: request.headers['x-app-version'] || 'Unknown',
      deviceId: request.headers['x-device-id'] || null,
      deviceModel: request.headers['x-device-model'] || 'Unknown',
    };
    return deviceInfo;
  }

  private extractIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'Unknown'
    );
  }

  private validateDeviceBinding(
    currentDevice: any,
    sessionMetadata: any,
  ): boolean {
    // Primary validation: Device ID (if available)
    if (currentDevice.deviceId && sessionMetadata.deviceId) {
      return currentDevice.deviceId === sessionMetadata.deviceId;
    }

    // Fallback validation: User Agent comparison
    /*if (currentDevice.userAgent && sessionMetadata.userAgent) {
      return currentDevice.userAgent === sessionMetadata.userAgent;
    }
    */

    return false;
  }
}
