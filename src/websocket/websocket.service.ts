import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { UserType } from 'src/common/user-type.enum';
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

  getRedisService(): RedisService {
    return this.redisService;
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

  async sendToDrivers(event: string, data: any) {
    return this.sendToUserType('driver', event, data);
  }

  async sendToCustomers(event: string, data: any) {
    return this.sendToUserType('customer', event, data);
  }

  async getUserLocation(userId: string) {
    return this.redisService.getUserLocation(userId);
  }

  async findNearbyUsers(
    userType: UserType,
    latitude: number,
    longitude: number,
    radius: number = 5,
    onlyAvailable: boolean = false,
  ) {
    return this.redisService.findNearbyUsers(
      userType,
      latitude,
      longitude,
      radius,
      onlyAvailable,
    );
  }

  async findNearbyAvailableDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5,
  ) {
    return this.redisService.findNearbyAvailableDrivers(
      latitude,
      longitude,
      radius,
    );
  }

  async broadcastTripRequest(event: any, activeDrivers: string[]): Promise<void> {
    const roomName = `trip-request-${event._id}`;
    const server = this.getServer();
    
    // Add drivers to the room
    activeDrivers.forEach(driverId => {
      server.in(`user:${driverId}`).socketsJoin(roomName);
    });
    
    // Broadcast to the room
    return new Promise<void>((resolve) => {
      server.to(roomName).emit('trip:request', event);
      this.logger.log(`Broadcasted trip request to ${activeDrivers.length} active drivers via WebSocket`);
      resolve();
    });
  }
}
