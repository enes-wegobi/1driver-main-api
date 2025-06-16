import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { EventType } from 'src/modules/event/enum/event-type.enum';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor() {}

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server {
    return this.server;
  }

  async sendToUser(userId: string, event: string, data: any) {
    this.logger.debug(`Sending to user ${userId}`);
    this.server.to(`user:${userId}`).emit(event, data);
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

      this.logger.log(
        `Sent ${eventType} to ${activeDrivers.length} active drivers via WebSocket`,
      );
      resolve();
    });
  }
}
