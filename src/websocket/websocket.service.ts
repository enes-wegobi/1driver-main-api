import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LoggerService } from 'src/logger/logger.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';
import { WebSocketRedisService } from 'src/redis/services/websocket-redis.service';

@Injectable()
export class WebSocketService {
  private server: Server;

  constructor(
    private readonly logger: LoggerService,
    private readonly webSocketRedis: WebSocketRedisService,
  ) {}

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
   * Register a WebSocket connection for a user (single connection per user)
   * If user already has an active connection, disconnect the old one
   */
  async registerUserConnection(
    userId: string,
    userType: UserType,
    socket: Socket,
    deviceId: string,
  ): Promise<void> {
    // Check for existing connection and disconnect it
    const existingConnection = await this.webSocketRedis.setActiveConnection(
      userId,
      userType,
      socket.id,
      deviceId,
    );

    if (existingConnection) {
      await this.forceDisconnectSocket(existingConnection.socketId, 'new_session_established');
      
      this.logger.info('Previous WebSocket connection disconnected due to new login', {
        userId,
        userType,
        oldSocketId: existingConnection.socketId,
        oldDeviceId: existingConnection.deviceId,
        newSocketId: socket.id,
        newDeviceId: deviceId,
      });
    }

    this.logger.info('User WebSocket connection registered', {
      userId,
      userType,
      socketId: socket.id,
      deviceId,
      hadPreviousConnection: !!existingConnection,
    });
  }

  /**
   * Force logout a user (disconnect their active WebSocket)
   */
  async forceLogoutUser(
    userId: string,
    userType: UserType,
    reason: string,
    metadata?: {
      timestamp?: string;
      newDeviceId?: string;
    },
  ): Promise<boolean> {
    try {
      const activeConnection = await this.webSocketRedis.getActiveConnection(userId, userType);
      
      if (!activeConnection) {
        this.logger.warn('No active WebSocket connection found for user force logout', {
          userId,
          userType,
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

      // Send force logout event and disconnect
      const success = await this.forceDisconnectSocket(activeConnection.socketId, reason, forceLogoutEvent);

      if (success) {
        // Remove connection from Redis
        await this.webSocketRedis.removeActiveConnection(userId, userType);

        this.logger.info('User force logout completed', {
          userId,
          userType,
          socketId: activeConnection.socketId,
          deviceId: activeConnection.deviceId,
          reason,
        });
      }

      return success;
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

  /**
   * Force disconnect a specific socket
   */
  private async forceDisconnectSocket(
    socketId: string,
    reason: string,
    forceLogoutEvent?: any,
  ): Promise<boolean> {
    const socket = this.server.sockets.sockets.get(socketId);
    
    if (!socket) {
      this.logger.warn('Socket not found for force disconnect', { socketId, reason });
      return false;
    }

    // Send force logout event if provided
    if (forceLogoutEvent) {
      socket.emit('force_logout', forceLogoutEvent);
    }

    // Disconnect socket
    socket.disconnect(true);

    this.logger.info('Socket force disconnected', {
      socketId,
      reason,
      eventSent: !!forceLogoutEvent,
    });

    return true;
  }

  /**
   * Handle socket disconnection cleanup
   */
  async handleSocketDisconnect(socket: Socket): Promise<void> {
    const userId = socket.data.userId;
    const userType = socket.data.userType;
    
    if (userId && userType) {
      // Check if this socket is the active one for the user
      const isActive = await this.webSocketRedis.isActiveSocket(userId, userType, socket.id);
      
      if (isActive) {
        // Remove from Redis only if this is the active socket
        await this.webSocketRedis.removeActiveConnection(userId, userType);
        
        this.logger.info('Active WebSocket connection cleaned up on disconnect', {
          socketId: socket.id,
          userId,
          userType,
        });
      } else {
        this.logger.debug('Inactive socket disconnected (not cleaning Redis)', {
          socketId: socket.id,
          userId,
          userType,
        });
      }
    }
  }

  /**
   * Update activity timestamp for a user's WebSocket connection
   */
  async updateUserActivity(userId: string, userType: UserType): Promise<void> {
    await this.webSocketRedis.updateLastActivity(userId, userType);
  }
}
