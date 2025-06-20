/*import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from '../jwt/jwt.service';
import { TokenManagerService } from '../redis/services/token-manager.service';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenManager: TokenManagerService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client = context.switchToWs().getClient<Socket>();
      const token = client.handshake.auth?.token || 
                   client.handshake.query?.token ||
                   client.handshake.headers?.authorization?.replace('Bearer ', '');
      const deviceId = client.handshake.headers['device-id'] as string;
      
      if (!token || !deviceId) {
        this.logger.warn('WS_AUTH_FAILED_MISSING_CREDENTIALS', {
          socketId: client.id,
          hasToken: !!token,
          hasDeviceId: !!deviceId,
        });
        
        client.emit('auth_failed', { 
          reason: 'Missing credentials',
          code: 'MISSING_CREDENTIALS'
        });
        client.disconnect(true);
        return false;
      }
      
      // Real-time blacklist check
      const isBlacklisted = await this.tokenManager.isTokenBlacklisted(token);
      if (isBlacklisted) {
        this.logger.warn('WS_AUTH_FAILED_TOKEN_BLACKLISTED', {
          socketId: client.id,
          deviceId,
        });
        
        client.emit('auth_failed', { 
          reason: 'Token blacklisted',
          code: 'TOKEN_BLACKLISTED'
        });
        client.disconnect(true);
        return false;
      }
      
      // JWT decode and validate
      const payload = await this.jwtService.validateToken(token);
      
      if (!payload || !payload.userId) {
        this.logger.warn('WS_AUTH_FAILED_INVALID_TOKEN', {
          socketId: client.id,
          deviceId,
        });
        
        client.emit('auth_failed', { 
          reason: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
        client.disconnect(true);
        return false;
      }
      
      // Device ID match check
      if (payload.deviceId && payload.deviceId !== deviceId) {
        this.logger.error('WS_AUTH_FAILED_DEVICE_MISMATCH', {
          socketId: client.id,
          tokenDeviceId: payload.deviceId,
          requestDeviceId: deviceId,
          userId: payload.userId,
        });
        
        client.emit('auth_failed', { 
          reason: 'Device mismatch',
          code: 'DEVICE_MISMATCH'
        });
        client.disconnect(true);
        return false;
      }
      
      //Active session check
      const isValidSession = await this.tokenManager.validateActiveSession(
        payload.userId,
        payload.userType,
        token,
        deviceId
      );
      
      
      if (!isValidSession) {
        this.logger.warn('WS_AUTH_FAILED_INVALID_SESSION', {
          socketId: client.id,
          deviceId,
          userId: payload.userId,
          userType: payload.userType,
        });
        
        client.emit('auth_failed', { 
          reason: 'Invalid session',
          code: 'INVALID_SESSION'
        });
        client.disconnect(true);
        return false;
      }
      
      // Update last seen
      await this.tokenManager.updateLastSeen(payload.userId, payload.userType);
      
      // Attach user info to socket
      client.data.userId = payload.userId;
      client.data.userType = payload.userType;
      client.data.deviceId = deviceId;
      client.data.authenticated = true;
      
      this.logger.debug('WS_AUTH_SUCCESS', {
        socketId: client.id,
        userId: payload.userId,
        userType: payload.userType,
        deviceId,
      });
      
      return true;
      
    } catch (error) {
      this.logger.error('WS_AUTH_ERROR', {
        socketId: context.switchToWs().getClient<Socket>().id,
        error: error.message,
        stack: error.stack,
      });
      
      const client = context.switchToWs().getClient<Socket>();
      client.emit('auth_failed', { 
        reason: 'Authentication failed',
        code: 'AUTH_ERROR'
      });
      client.disconnect(true);
      return false;
    }
  }
}
*/