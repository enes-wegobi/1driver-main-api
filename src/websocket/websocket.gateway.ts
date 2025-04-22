import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayConnection,
  OnGatewayInit,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';
import { JwtService } from 'src/jwt/jwt.service';
import { LocationDto } from './dto/location.dto';
import { DriverLocationDto, DriverAvailabilityStatus } from './dto/driver-location.dto';
import { RedisClientType } from 'redis';

const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;

@NestWebSocketGateway({
  cors: {
    origin: ["http://localhost:8080", "http://127.0.0.1:8080", "https://1drive-dev.wegobitest.com"],
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type']
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: PING_INTERVAL,
  pingTimeout: PING_TIMEOUT,
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
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

      // If this is a driver, mark them as active
      if (userType === 'driver') {
        await this.webSocketService.getRedisService().markDriverAsActive(payload.userId);
        
        // Get current availability status
        const status = await this.webSocketService.getRedisService().getDriverAvailability(payload.userId);
        
        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          availabilityStatus: status,
          message: 'Connection successful',
        });
      } else {
        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          message: 'Connection successful',
        });
      }

      this.logger.log(
        `Client ${clientId} authenticated as ${userType} with userId: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.emit('error', {
        message: 'Authentication failed',
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const userType = client.data.userType;
    
    if (userId && userType === 'driver') {
      // Mark driver as inactive when they disconnect
      await this.webSocketService.getRedisService().markDriverAsInactive(userId);
      this.logger.log(`Driver ${userId} marked as inactive due to disconnect`);
    }
    
    this.logger.log(`Client disconnected: ${client.id}`);
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
    // Client must be connected and authenticated
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    this.logger.debug(
      `Location update from ${userType} ${userId}: ${JSON.stringify(payload)}`,
    );

    // Store location to redis
    this.storeUserLocation(userId, userType, payload);
    
    // If user is in a trip room, broadcast location to the room
    this.broadcastLocationToTripRoom(client, payload);

    return { success: true };
  }
  
  /**
   * Broadcast location updates to trip room if user is in an active trip
   */
  private async broadcastLocationToTripRoom(client: Socket, location: LocationDto) {
    try {
      const userId = client.data.userId;
      const userType = client.data.userType;
      
      if (!userId) return;
      
      // Check if user is in any trip rooms
      const rooms = Array.from(client.rooms);
      const tripRooms = rooms.filter(room => room.startsWith('trip:'));
      
      if (tripRooms.length === 0) return;
      
      // Broadcast location to all trip rooms the user is in
      for (const room of tripRooms) {
        const tripId = room.split(':')[1];
        
        // Broadcast to the room except the sender
        client.to(room).emit('locationUpdate', {
          tripId,
          userId,
          userType,
          location,
          timestamp: new Date().toISOString(),
        });
        
        this.logger.debug(`Broadcasted ${userType} location to trip room ${room}`);
      }
    } catch (error) {
      this.logger.error(`Error broadcasting location to trip room: ${error.message}`);
    }
  }

  @SubscribeMessage('updateDriverLocation')
  handleDriverLocationUpdate(client: Socket, payload: DriverLocationDto) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    if (userType !== 'driver') {
      client.emit('error', { message: 'Only drivers can update driver location' });
      return { success: false, message: 'Only drivers can update driver location' };
    }

    this.logger.debug(
      `Driver location update from ${userId}: ${JSON.stringify(payload)}`,
    );

    // Store location to redis
    this.storeUserLocation(userId, userType, payload);
    
    // Broadcast location to trip room if driver is in an active trip
    this.broadcastLocationToTripRoom(client, payload);

    return { success: true };
  }
  
  @SubscribeMessage('joinTripRoom')
  handleJoinTripRoom(client: Socket, payload: { tripId: string }) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    if (!payload.tripId) {
      client.emit('error', { message: 'Trip ID is required' });
      return { success: false, message: 'Trip ID is required' };
    }

    const roomName = `trip:${payload.tripId}`;
    
    // Join the room
    client.join(roomName);
    
    this.logger.debug(
      `User ${userId} (${userType}) joined trip room ${roomName}`,
    );
    
    // Notify the room that a user has joined
    client.to(roomName).emit('userJoinedTrip', {
      userId,
      userType,
      tripId: payload.tripId,
      timestamp: new Date().toISOString(),
    });
    
    return { 
      success: true,
      message: `Joined trip room for trip ${payload.tripId}`,
    };
  }
  
  @SubscribeMessage('leaveTripRoom')
  handleLeaveTripRoom(client: Socket, payload: { tripId: string }) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    if (!payload.tripId) {
      client.emit('error', { message: 'Trip ID is required' });
      return { success: false, message: 'Trip ID is required' };
    }

    const roomName = `trip:${payload.tripId}`;
    
    // Leave the room
    client.leave(roomName);
    
    this.logger.debug(
      `User ${userId} (${userType}) left trip room ${roomName}`,
    );
    
    // Notify the room that a user has left
    client.to(roomName).emit('userLeftTrip', {
      userId,
      userType,
      tripId: payload.tripId,
      timestamp: new Date().toISOString(),
    });
    
    return { 
      success: true,
      message: `Left trip room for trip ${payload.tripId}`,
    };
  }

  @SubscribeMessage('updateDriverAvailability')
  async handleDriverAvailabilityUpdate(
    client: Socket, 
    payload: { status: DriverAvailabilityStatus }
  ) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    if (userType !== 'driver') {
      client.emit('error', { message: 'Only drivers can update availability status' });
      return { success: false, message: 'Only drivers can update availability status' };
    }

    this.logger.debug(
      `Driver ${userId} availability update: ${payload.status}`,
    );

    try {
      await this.webSocketService
        .getRedisService()
        .updateDriverAvailability(userId, payload.status);
        
      return { 
        success: true, 
        status: payload.status 
      };
    } catch (error) {
      this.logger.error(
        `Error updating driver ${userId} availability: ${error.message}`,
      );
      return { 
        success: false, 
        message: 'Failed to update availability status' 
      };
    }
  }

  private async storeUserLocation(
    userId: string,
    userType: string,
    location: LocationDto,
  ) {
    try {
      // Use Redis service to store location
      await this.webSocketService
        .getRedisService()
        .storeUserLocation(userId, userType, location);
      
      // If this is a driver, send updates to subscribed clients
      if (userType === 'driver') {
        await this.sendDriverLocationUpdatesToSubscribers(userId, location);
      }
    } catch (error) {
      this.logger.error(
        `Error storing location for user ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Send driver location updates to all subscribed clients
   */
  private async sendDriverLocationUpdatesToSubscribers(
    driverId: string,
    location: LocationDto,
  ) {
    try {
      const redisClient: RedisClientType = this.webSocketService.getRedisService().getRedisClient();
      
      // Get driver details
      const driverLocation = await this.webSocketService.getRedisService().getUserLocation(driverId);
      if (!driverLocation) return;
      
      // Only send updates for available drivers
      if (driverLocation.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE) {
        return;
      }
      
      // Get all active subscriptions
      const subscriptionKeys = await redisClient.keys('subscription:*');
      
      for (const key of subscriptionKeys) {
        const subscriptionData = await redisClient.hGetAll(key);
        if (!subscriptionData) continue;
        
        const clientId = key.split(':')[1];
        const subLatitude = parseFloat(subscriptionData.latitude);
        const subLongitude = parseFloat(subscriptionData.longitude);
        const subRadius = parseFloat(subscriptionData.radius || '5');
        
        // Calculate distance between driver and subscription center
        const distance = this.calculateDistance(
          subLatitude,
          subLongitude,
          location.latitude,
          location.longitude,
        );
        
        // If driver is within radius, send update to the client
        if (distance <= subRadius) {
          const driverInfo = {
            driverId,
            distance,
            location: {
              latitude: location.latitude,
              longitude: location.longitude,
            },
            availabilityStatus: driverLocation.availabilityStatus,
            lastUpdated: new Date().toISOString(),
          };
          
          this.server.to(`user:${clientId}`).emit('nearbyDriverUpdate', driverInfo);
          this.logger.debug(`Sent driver ${driverId} location update to client ${clientId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error sending driver location updates: ${error.message}`);
    }
  }
  
  /**
   * Calculate distance between two coordinates in kilometers using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
