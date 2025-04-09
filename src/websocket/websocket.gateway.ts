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
    this.logger.log('Socket.IO Server initialized');
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
      //Todo user type
      if (userType !== 'driver' && userType !== 'customer') {
        client.emit('error', { message: 'Invalid user type' });
        client.disconnect(true);
        return;
      }

      await this.webSocketService.handleConnection(client, payload.userId, userType);

      client.emit('connection', { 
        status: 'connected',
        clientId: clientId,
        userType: userType,
        message: 'Connection successful'
      });
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.emit('error', {
        message: 'Authentication failed',
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const clientId = client.id;
    await this.webSocketService.handleDisconnection(clientId);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    const clientId = client.id;
    this.logger.debug(
      `Message received [${clientId}]: ${JSON.stringify(payload)}`,
    );

    // Update activity and process message
    const response = this.webSocketService.processMessage(clientId, payload);
    return { event: 'message', data: response };
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    client: Socket,
    payload: { token: string; userId: string },
  ) {
    const clientId = client.id;
    this.logger.debug(`Authentication request from ${clientId}`);

    try {
      // In a real implementation, you'd validate the token
      // For now, just associate the client with the user ID
      this.webSocketService.authenticateClient(clientId, payload.userId);
      return { event: 'authenticate', data: { success: true } };
    } catch (error) {
      this.logger.error(
        `Authentication error for ${clientId}: ${error.message}`,
      );
      return {
        event: 'authenticate',
        data: { success: false, error: error.message },
      };
    }
  }
}
