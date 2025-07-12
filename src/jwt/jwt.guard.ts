import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from './jwt.service';
import { TokenManagerService } from '../redis/services/token-manager.service';
import { LoggerService } from '../logger/logger.service';
import { ForceLogoutService } from '../modules/auth/force-logout.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private tokenManagerService: TokenManagerService,
    private loggerService: LoggerService,
    private forceLogoutService: ForceLogoutService,
    
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Check if token is blacklisted
    const isBlacklisted =
      await this.tokenManagerService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    const payload = await this.jwtService.validateToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Extract current device and session info
    const currentDeviceInfo = this.extractDeviceInfo(request);
    const currentIpAddress = this.extractIpAddress(request);

    try {
      // Get stored session metadata from token manager
      const sessionMetadata = await this.tokenManagerService.getActiveToken(payload.userId, payload.userType);

      if (sessionMetadata) {
        // Validate device binding
        const isValidDevice = this.validateDeviceBinding(currentDeviceInfo, sessionMetadata);
        
        if (!isValidDevice) {
          this.loggerService.warn('Device mismatch detected', {
            userId: payload.userId,
            userType: payload.userType,
            currentDevice: currentDeviceInfo,
            storedDevice: sessionMetadata.deviceInfo,
            ipAddress: currentIpAddress,
          });

        // Force logout and revoke token
        await this.forceLogoutService.executeForceLogout(
                     payload.userId,
                     payload.userType,
                     sessionMetadata.deviceId || 'unknown',
                     currentDeviceInfo.deviceId || 'unknown',
                     'Device binding validation failed'
                   );

          throw new UnauthorizedException('Device validation failed');
        }

        // Check for significant IP changes (optional security measure)
        if (sessionMetadata.ipAddress && sessionMetadata.ipAddress !== currentIpAddress) {
          this.loggerService.warn('IP address change detected', {
            userId: payload.userId,
            userType: payload.userType,
            previousIp: sessionMetadata.ipAddress,
            currentIp: currentIpAddress,
            deviceInfo: currentDeviceInfo,
          });

          // Update IP in session metadata but allow access
          await this.tokenManagerService.updateLastSeen(payload.userId, payload.userType, currentIpAddress);
        } else {
          // Regular activity update
          await this.tokenManagerService.updateLastSeen(payload.userId, payload.userType);
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
    return {
      userAgent: request.headers['user-agent'] || 'Unknown',
      platform: request.headers['x-platform'] || 'Unknown',
      appVersion: request.headers['x-app-version'] || 'Unknown',
      deviceId: request.headers['x-device-id'] || null,
      deviceModel: request.headers['x-device-model'] || 'Unknown',
    };
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

  private validateDeviceBinding(currentDevice: any, sessionMetadata: any): boolean {
    // Primary validation: Device ID (if available)
    if (currentDevice.deviceId && sessionMetadata.deviceInfo?.deviceId) {
      return currentDevice.deviceId === sessionMetadata.deviceInfo.deviceId;
    }

    // Fallback validation: User Agent and Platform combination
    const currentFingerprint = this.createDeviceFingerprint(currentDevice);
    const storedFingerprint = this.createDeviceFingerprint(sessionMetadata.deviceInfo);

    return currentFingerprint === storedFingerprint;
  }

  private createDeviceFingerprint(deviceInfo: any): string {
    if (!deviceInfo) return 'unknown';
    
    const components = [
      deviceInfo.userAgent || '',
      deviceInfo.platform || '',
      deviceInfo.deviceModel || '',
    ];
    
    return components.join('|').toLowerCase();
  }
}
