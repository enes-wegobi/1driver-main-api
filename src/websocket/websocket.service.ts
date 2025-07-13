import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LoggerService } from 'src/logger/logger.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';

export interface DeviceConnectionInfo {
  socketId: string;
  userId: string;
  userType: UserType;
  deviceId: string;
  connectedAt: string;
  lastActivity: string;
}

@Injectable()
export class WebSocketService {
  private server: Server;
  private deviceConnections = new Map<string, DeviceConnectionInfo[]>();

  constructor(private readonly logger: LoggerService) {}

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server {
    return this.server;
  }

  async sendToUser(userId: string, event: string, data: any) {
    const room = `user:${userId}`;
    const sockets = await this.server.in(room).fetchSockets();

    this.logger.debug(`[SOCKET_SEND] Attempting to send ${event} to ${room}`);
    this.logger.debug(
      `[SOCKET_SEND] Found ${sockets.length} connected sockets in room ${room}`,
    );

    if (sockets.length === 0) {
      this.logger.warn(
        `[SOCKET_SEND] No connected sockets found for user ${userId} in room ${room}`,
      );
    }

    sockets.forEach((socket) => {
      this.logger.debug(`[SOCKET_SEND] Socket ${socket.id} exists in room`);
    });

    this.server.to(room).emit(event, data);
    this.logger.debug(
      `[SOCKET_SEND] Message sent to room ${room} for event ${event}`,
    );
  }

  async broadcastToUsers(
    event: any,
    activeDrivers: string[],
    eventType: EventType,
  ): Promise<void> {
    const server = this.getServer();

    // Send message to each driver individually
    return new Promise<void>((resolve) => {
      activeDrivers.forEach((driverId) => {
        server.to(`user:${driverId}`).emit(eventType, event);
      });

      this.logger.info(
        `Sent ${eventType} to ${activeDrivers.length} active drivers via WebSocket`,
      );
      resolve();
    });
  }

  /**
   * Register a device connection for tracking
   */
  async registerDeviceConnection(
    deviceId: string,
    socket: Socket,
    userId: string,
    userType: UserType,
  ): Promise<void> {
    const connectionInfo: DeviceConnectionInfo = {
      socketId: socket.id,
      userId,
      userType,
      deviceId,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    if (!this.deviceConnections.has(deviceId)) {
      this.deviceConnections.set(deviceId, []);
    }

    const connections = this.deviceConnections.get(deviceId)!;
    connections.push(connectionInfo);

    this.logger.debug('Device connection registered', {
      deviceId,
      userId,
      userType,
      socketId: socket.id,
      totalConnections: connections.length,
    });
  }

  /**
   * Force logout a specific device
   */
  async forceLogoutDevice(
    deviceId: string,
    reason: string,
    metadata?: {
      userId?: string;
      userType?: UserType;
      timestamp?: string;
      newDeviceId?: string;
    },
  ): Promise<boolean> {
    try {
      const connections = this.deviceConnections.get(deviceId) || [];
      
      if (connections.length === 0) {
        this.logger.warn('No WebSocket connections found for device force logout', {
          deviceId,
          reason,
        });
        return false;
      }

      const forceLogoutEvent = {
        reason,
        timestamp: metadata?.timestamp || new Date().toISOString(),
        action: 'immediate_disconnect',
        newDeviceId: metadata?.newDeviceId,
        message: 'Your session has been terminated from another device',
      };

      let disconnectedSockets = 0;

      // Send force logout event and immediately disconnect
      for (const connection of connections) {
        const socket = this.server.sockets.sockets.get(connection.socketId);
        
        if (socket) {
          // Emit force logout event and immediately disconnect
          socket.emit('force_logout', forceLogoutEvent);
          socket.disconnect(true);
          disconnectedSockets++;

          this.logger.info('Force logout event sent and socket disconnected', {
            socketId: connection.socketId,
            deviceId,
            userId: connection.userId,
            reason,
          });
        }
      }

      // Remove device connections from tracking
      this.deviceConnections.delete(deviceId);

      this.logger.info('Device force logout completed', {
        deviceId,
        reason,
        socketsNotified: connections.length,
        socketsDisconnected: disconnectedSockets,
      });

      return true;
    } catch (error) {
      this.logger.error('Error during device force logout', {
        deviceId,
        reason,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Handle socket disconnection cleanup
   */
  async handleSocketDisconnect(socket: Socket): Promise<void> {
    const deviceId = socket.data.deviceId;
    
    if (deviceId) {
      const connections = this.deviceConnections.get(deviceId) || [];
      const filteredConnections = connections.filter(
        conn => conn.socketId !== socket.id
      );

      if (filteredConnections.length === 0) {
        this.deviceConnections.delete(deviceId);
      } else {
        this.deviceConnections.set(deviceId, filteredConnections);
      }

      this.logger.debug('Socket disconnection cleaned up', {
        socketId: socket.id,
        deviceId,
        remainingConnections: filteredConnections.length,
      });
    }
  }

  /**
   * Update activity timestamp for a device connection
   */
  async updateDeviceActivity(deviceId: string, socketId: string): Promise<void> {
    const connections = this.deviceConnections.get(deviceId);
    if (connections) {
      const connection = connections.find(conn => conn.socketId === socketId);
      if (connection) {
        connection.lastActivity = new Date().toISOString();
      }
    }
  }

  /**
   * Get all active connections for a device
   */
  getDeviceConnections(deviceId: string): DeviceConnectionInfo[] {
    return this.deviceConnections.get(deviceId) || [];
  }

  /**
   * Get all active devices for a user
   */
  getUserDevices(userId: string): string[] {
    const devices: string[] = [];
    
    for (const [deviceId, connections] of this.deviceConnections.entries()) {
      if (connections.some(conn => conn.userId === userId)) {
        devices.push(deviceId);
      }
    }
    
    return devices;
  }

  /**
   * Send force logout to user across all devices
   */
  async forceLogoutUser(
    userId: string,
    userType: UserType,
    reason: string,
    excludeDeviceId?: string,
  ): Promise<boolean> {
    try {
      const userDevices = this.getUserDevices(userId);
      const devicesToLogout = excludeDeviceId 
        ? userDevices.filter(deviceId => deviceId !== excludeDeviceId)
        : userDevices;

      if (devicesToLogout.length === 0) {
        this.logger.info('No devices to force logout for user', {
          userId,
          userType,
          reason,
        });
        return true;
      }

      let successCount = 0;
      for (const deviceId of devicesToLogout) {
        const success = await this.forceLogoutDevice(deviceId, reason, {
          userId,
          userType,
          timestamp: new Date().toISOString(),
        });
        if (success) successCount++;
      }

      this.logger.info('User force logout completed', {
        userId,
        userType,
        reason,
        totalDevices: devicesToLogout.length,
        successfulLogouts: successCount,
      });

      return successCount > 0;
    } catch (error) {
      this.logger.error('Error during user force logout', {
        userId,
        userType,
        reason,
        error: error.message,
      });
      return false;
    }
  }
}
