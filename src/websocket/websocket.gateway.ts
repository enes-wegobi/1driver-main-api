// in websocket.gateway.ts
import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';
import { JwtService } from 'src/jwt/jwt.service';
import { LocationDto } from './dto/location.dto';

const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;

@NestWebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: PING_INTERVAL,
  pingTimeout: PING_TIMEOUT,
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly jwtService: JwtService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log('Socket.IO Server initialized with Redis Adapter');
    this.webSocketService.setServer(server);
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const clientId = client.id;

    const token =
      client.handshake.auth.token ||
      client.handshake.query.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      client.emit('error', {
        message: 'Authentication required',
      });
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.validateToken(token);

      if (!payload || !payload.userId) {
        client.emit('error', { message: 'Invalid token' });
        client.disconnect(true);
        return;
      }

      const userType = payload.userType;
      if (userType !== 'driver' && userType !== 'customer') {
        client.emit('error', { message: 'Invalid user type' });
        client.disconnect(true);
        return;
      }

      // Store user data in the socket
      client.data.userId = payload.userId;
      client.data.userType = userType;
      
      // Join rooms based on user type and ID for easier targeting
      client.join(`user:${payload.userId}`);
      client.join(`type:${userType}`);

      client.emit('connection', { 
        status: 'connected',
        clientId: clientId,
        userType: userType,
        message: 'Connection successful'
      });
      
      this.logger.log(`Client ${clientId} authenticated as ${userType} with userId: ${payload.userId}`);
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.emit('error', {
        message: 'Authentication failed',
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Socket.IO and Redis adapter handle cleanup automatically
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    this.logger.debug(
      `Message received [${client.id}]: ${JSON.stringify(payload)}`,
    );
    return { event: 'message', data: payload };
  }

  @SubscribeMessage('updateLocation')
  handleLocationUpdate(client: Socket, payload: LocationDto) {
    // Client zaten bağlı ve doğrulanmış olmalı
    const userId = client.data.userId;
    const userType = client.data.userType;
    
    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }
    
    this.logger.debug(`Location update from ${userType} ${userId}: ${JSON.stringify(payload)}`);
    
    // Konumu Redis'e kaydedelim
    this.storeUserLocation(userId, userType, payload);
    
    // Kullanıcı tipine göre farklı işlemler yapabiliriz
    if (userType === 'driver') {
      // Sürücü konumunu belirli müşterilere göndermek için kullanabiliriz
      // Örneğin, bu sürücüye atanmış bir yolcu varsa ona konum güncellemesi gönderilebilir
    }
    
    // İşlem başarılı cevabı
    return { success: true };
  }
  
  private async storeUserLocation(userId: string, userType: string, location: LocationDto) {
    try {
      // Use Redis service to store location
      await this.webSocketService.getRedisService().storeUserLocation(userId, userType, location);
    } catch (error) {
      this.logger.error(`Error storing location for user ${userId}: ${error.message}`);
    }
  }
}