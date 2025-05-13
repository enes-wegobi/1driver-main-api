import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor(private readonly redisService: RedisService) {}

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

  broadcast(event: string, data: any, exceptSocketId?: string) {
    this.logger.debug(`Broadcasting: ${event}`);
    if (exceptSocketId) {
      this.server.except(exceptSocketId).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }

  async sendToUserType(userType: string, event: string, data: any) {
    this.logger.debug(`Sending to ${userType}s`);
    this.server.to(`type:${userType}`).emit(event, data);
  }

  async getUserLocation(userId: string) {
    return this.redisService.getUserLocation(userId);
  }

  async broadcastTripRequest(
    event: any,
    activeDrivers: string[],
  ): Promise<void> {
    const roomName = `trip-request-${event._id}`;
    const server = this.getServer();

    // Add drivers to the room
    activeDrivers.forEach((driverId) => {
      server.in(`user:${driverId}`).socketsJoin(roomName);
    });

    // Broadcast to the room
    return new Promise<void>((resolve) => {
      server.to(roomName).emit('trip:request', event);
      this.logger.log(
        `Broadcasted trip request to ${activeDrivers.length} active drivers via WebSocket`,
      );
      resolve();
    });
  }
}
