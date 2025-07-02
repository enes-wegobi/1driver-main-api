import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { LoggerService } from 'src/logger/logger.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';

@Injectable()
export class WebSocketService {
  private server: Server;

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
}
