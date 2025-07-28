import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { LoggerService } from 'src/logger/logger.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { UserType } from 'src/common/user-type.enum';
import { UnifiedUserRedisService } from 'src/redis/services/unified-user-redis.service';

@Injectable()
export class WebSocketService {
  private server: Server;

  constructor(
    private readonly logger: LoggerService,
    private readonly unifiedUserRedis: UnifiedUserRedisService,
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
      let activeConnection;
      if (userType === UserType.DRIVER) {
        const driverData = await this.unifiedUserRedis.getDriverStatus(userId);
        activeConnection = driverData?.websocket;
      } else {
        const customerData =
          await this.unifiedUserRedis.getCustomerStatus(userId);
        activeConnection = customerData?.websocket;
      }

      if (!activeConnection?.socketId) {
        this.logger.warn(
          'No active WebSocket connection found for user force logout',
          {
            userId,
            userType,
            reason,
          },
        );
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
      const success = await this.forceDisconnectSocket(
        activeConnection.socketId,
        reason,
        forceLogoutEvent,
      );

      if (success) {
        // Remove connection from unified Redis service (complete removal for force logout)
        await this.unifiedUserRedis.forceLogoutUser(
          userId,
          userType,
          activeConnection.socketId,
        );
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
    if (!this.server) {
      this.logger.error(
        'WebSocket server not initialized for force disconnect',
        { socketId, reason },
      );
      return false;
    }

    try {
      if (forceLogoutEvent) {
        this.server.to(socketId).emit('force_logout', forceLogoutEvent);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      this.server.to(socketId).disconnectSockets(true);
      return true;
    } catch (error) {
      this.logger.error(
        'Socket disconnect failed - socket may already be disconnected',
        {
          socketId,
          reason,
          error: error.message,
        },
      );
      return true;
    }
  }
}
