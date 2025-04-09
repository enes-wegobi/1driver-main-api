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
  
const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;
  
@NestWebSocketGateway({
  cors: {
    origin: '*',
    credentials: false
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: PING_INTERVAL,
  pingTimeout: PING_TIMEOUT,
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WebSocketGateway.name);
  
  constructor(private readonly webSocketService: WebSocketService) {}
  
  @WebSocketServer()
  server: Server;
  
  afterInit(server: Server) {
    this.logger.log('Socket.IO Server initialized');
    this.webSocketService.setServer(server);
  }
  
  async handleConnection(client: Socket, ...args: any[]) {
    const clientId = client.id;
    
    // Register client with service
    await this.webSocketService.handleConnection(client);
    
    // Welcome message
    client.emit('connection', { 
      status: 'connected',
      clientId: clientId,
      message: 'Connection successful'
    });
  }
  
  async handleDisconnect(client: Socket) {
    const clientId = client.id;
    await this.webSocketService.handleDisconnection(clientId);
  }
  
  @SubscribeMessage('pong')
  handlePong(client: Socket) {
    this.webSocketService.updateClientActivity(client.id);
  }
  
  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    const clientId = client.id;
    this.logger.debug(`Message received [${clientId}]: ${JSON.stringify(payload)}`);
    
    // Update activity and process message
    const response = this.webSocketService.processMessage(clientId, payload);
    return { event: 'message', data: response };
  }
  
  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: { token: string, userId: string }) {
    const clientId = client.id;
    this.logger.debug(`Authentication request from ${clientId}`);
    
    try {
      // In a real implementation, you'd validate the token
      // For now, just associate the client with the user ID
      this.webSocketService.authenticateClient(clientId, payload.userId);
      return { event: 'authenticate', data: { success: true } };
    } catch (error) {
      this.logger.error(`Authentication error for ${clientId}: ${error.message}`);
      return { event: 'authenticate', data: { success: false, error: error.message } };
    }
  }
}