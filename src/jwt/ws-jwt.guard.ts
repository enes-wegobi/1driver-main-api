import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';
import { JwtService } from './jwt.service';
import { TokenManagerService } from '../redis/services/token-manager.service';
import { LoggerService } from '../logger/logger.service';
import { UserType } from '../common/user-type.enum';

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
      
      // Extract authentication data
      const token = this.extractToken(client);
      const deviceId = this.extractDeviceId(client);
      const ipAddress = this.extractIpAddress(client);

      if (!token) {
        this.logger.warn('WebSocket authentication failed: No token provided', {
          socketId: client.id,
          ipAddress,
        });
        client.emit('auth_failed', { 
          reason: 'no_token',
          message: 'Authentication token required',
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return false;
      }

      if (!deviceId) {
        this.logger.warn('WebSocket authentication failed: No device ID provided', {
          socketId: client.id,
          ipAddress,
        });
        client.emit('auth_failed', { 
          reason: 'no_device_id',
          message: 'Device ID header required',
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return false;
      }

      // Validate JWT token
      const payload = await this.jwtService.validateToken(token);
      if (!payload || !payload.userId) {
        this.logger.warn('WebSocket authentication failed: Invalid JWT token', {
          socketId: client.id,
          deviceId,
          ipAddress,
        });
        client.emit('auth_failed', { 
          reason: 'invalid_token',
          message: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return false;
      }

      const userType = payload.userType as UserType;
      const userId = payload.userId;

      // Check active session and verify all details
      const activeSession = await this.tokenManager.getActiveToken(userId, userType);
      if (!activeSession) {
        this.logger.warn('WebSocket authentication failed: No active session', {
          userId,
          userType,
          deviceId,
          socketId: client.id,
        });
        client.emit('auth_failed', { 
          reason: 'no_active_session',
          message: 'No active session found',
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return false;
      }

      // Verify device ID matches
      if (activeSession.deviceId !== deviceId) {
        this.logger.warn('WebSocket authentication failed: Device ID mismatch', {
          userId,
          userType,
          expectedDeviceId: activeSession.deviceId,
          actualDeviceId: deviceId,
          ipAddress,
          socketId: client.id,
        });
        client.emit('auth_failed', { 
          reason: 'device_mismatch',
          message: 'Device mismatch - please login again',
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return false;
      }

      // Verify token matches active session
      if (activeSession.token !== token) {
        this.logger.warn('WebSocket authentication failed: Token mismatch', {
          userId,
          userType,
          deviceId,
          socketId: client.id,
        });
        client.emit('auth_failed', { 
          reason: 'token_mismatch',
          message: 'Token mismatch - please login again',
          timestamp: new Date().toISOString(),
        });
        client.disconnect(true);
        return false;
      }

      // Check for suspicious IP changes
      if (activeSession.ipAddress && ipAddress !== activeSession.ipAddress) {
        this.logger.warn('WebSocket IP address changed', {
          userId,
          userType,
          deviceId,
          oldIp: activeSession.ipAddress,
          newIp: ipAddress,
          socketId: client.id,
        });
      }

      // Update last seen timestamp
      await this.tokenManager.updateLastSeen(userId, userType, ipAddress);

      // Store validated user data in socket
      client.data.userId = userId;
      client.data.userType = userType;
      client.data.deviceId = deviceId;
      client.data.ipAddress = ipAddress;
      client.data.lastValidated = new Date().toISOString();
      client.data.authenticated = true;

      this.logger.debug('WebSocket authentication successful', {
        userId,
        userType,
        deviceId,
        ipAddress: ipAddress?.substring(0, 10) + '...',
        socketId: client.id,
      });

      return true;
    } catch (error) {
      this.logger.error('WebSocket authentication error', {
        error: error.message,
        socketId: context.switchToWs().getClient().id,
      });
      
      const client = context.switchToWs().getClient<Socket>();
      client.emit('auth_failed', { 
        reason: 'authentication_error',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
      });
      client.disconnect(true);
      return false;
    }
  }

  private extractToken(client: Socket): string | null {
    // Try multiple sources for the token
    return (
      client.handshake.auth?.token ||
      client.handshake.query?.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '') ||
      null
    );
  }

  private extractDeviceId(client: Socket): string | null {
    const headerDeviceId = client.handshake.headers['device-id'];
    const headerDeviceIdLower = client.handshake.headers['device-id'.toLowerCase()];
    const queryDeviceId = client.handshake.query['device-id'];
    const authDeviceId = client.handshake.auth?.deviceId;
    
    return (
      (typeof headerDeviceId === 'string' ? headerDeviceId : null) ||
      (typeof headerDeviceIdLower === 'string' ? headerDeviceIdLower : null) ||
      (typeof queryDeviceId === 'string' ? queryDeviceId : null) ||
      (typeof authDeviceId === 'string' ? authDeviceId : null) ||
      null
    );
  }

  private extractIpAddress(client: Socket): string {
    const forwardedFor = client.handshake.headers['x-forwarded-for'];
    const realIp = client.handshake.headers['x-real-ip'];
    
    return (
      (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : null) ||
      (typeof realIp === 'string' ? realIp : null) ||
      client.handshake.address ||
      'unknown'
    );
  }
}
