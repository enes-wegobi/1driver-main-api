import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;
  
  constructor(private readonly redisService: RedisService) {}
  
  setServer(server: Server) {
    this.server = server;
  }
  
  async handleConnection(client: Socket, userId: string) {
    const clientId = client.id;
    this.logger.log(`New connection: ${clientId} for user: ${userId}`);
    
    await this.redisService.addClient(clientId, {
      ip: client.handshake.address,
      userAgent: client.handshake.headers['user-agent'],
      connectedAt: new Date().toISOString(),
      userId: userId,
    });
    
    await this.redisService.associateUserWithSocket(userId, clientId);
  }
  
  async handleDisconnection(clientId: string) {
    this.logger.log(`Client disconnected: ${clientId}`);
    
    // Get user ID before removing client
    const clientData = await this.redisService.getSocketClient(clientId);
    
    // Remove client from Redis
    await this.redisService.removeClient(clientId);
    
    // If client was associated with a user, remove from user's socket set
    if (clientData && clientData.userId) {
      await this.redisService.removeUserSocket(clientData.userId, clientId);
    }
  }
  
  async updateClientActivity(clientId: string) {
    await this.redisService.updateClientActivity(clientId);
  }
  
  async authenticateClient(clientId: string, userId: string) {
    // Associate this socket with the user
    await this.redisService.associateUserWithSocket(userId, clientId);
    this.logger.log(`Client ${clientId} authenticated as user ${userId}`);
  }
  
  async sendToUser(userId: string, event: string, data: any) {
    // Get all sockets for this user
    const socketIds = await this.redisService.getUserSockets(userId);
    
    this.logger.debug(`Sending to user ${userId} via ${socketIds.length} sockets`);
    
    // Emit to each socket
    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, data);
    }
  }
  
  processMessage(clientId: string, payload: any) {
    this.logger.debug(`Processing message from ${clientId}: ${JSON.stringify(payload)}`);
    
    // Update last activity timestamp
    this.updateClientActivity(clientId);
    
    // Process message based on type
    if (payload.type === 'authenticate' && payload.userId) {
      this.authenticateClient(clientId, payload.userId);
      return { success: true, message: 'Authenticated' };
    }
    
    // Default response
    return {
      processed: true,
      original: payload,
      timestamp: new Date().toISOString()
    };
  }
  
  broadcast(event: string, data: any, exceptClientId?: string) {
    this.logger.debug(`Broadcasting: ${event}`);
    if (exceptClientId) {
      this.server.except(exceptClientId).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }
}