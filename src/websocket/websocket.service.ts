import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';

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

  async sendTripRequest(
    tripData: any,
    driverId: string,
    eventType: EventType,
  ): Promise<void> {
    const server = this.getServer();

    return new Promise<void>((resolve) => {
      server.to(`user:${driverId}`).emit(eventType, tripData);
      this.logger.log(`Sent ${eventType} to driver ${driverId} via WebSocket`);
      resolve();
    });
  }

  async getUserLocation(userId: string) {
    return this.redisService.getUserLocation(userId);
  }

  async broadcastTripRequest(
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
