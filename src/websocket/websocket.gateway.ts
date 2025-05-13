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
import {
  DriverLocationDto,
  DriverAvailabilityStatus,
} from './dto/driver-location.dto';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { LocationService } from 'src/redis/services/location.service';

const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;

@NestWebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
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
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly locationService: LocationService,
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

      // Mark user as active based on user type
      if (userType === 'driver') {
        await this.driverStatusService.markDriverAsActive(payload.userId);

        // Get current availability status
        const status = await this.driverStatusService.getDriverAvailability(
          payload.userId,
        );

        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          availabilityStatus: status,
          message: 'Connection successful',
        });
      } else if (userType === 'customer') {
        await this.customerStatusService.markCustomerAsActive(payload.userId);

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

    if (userId) {
      if (userType === 'driver') {
        // Mark driver as inactive when they disconnect
        await this.driverStatusService.markDriverAsInactive(userId);
        this.logger.log(
          `Driver ${userId} marked as inactive due to disconnect`,
        );
      } else if (userType === 'customer') {
        // Mark customer as inactive when they disconnect
        await this.customerStatusService.markCustomerAsInactive(userId);
        this.logger.log(
          `Customer ${userId} marked as inactive due to disconnect`,
        );
      }
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
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    this.logger.debug(
      `Location update from ${userType} ${userId}: ${JSON.stringify(payload)}`,
    );

    this.storeUserLocation(userId, userType, payload);

    this.broadcastLocationToTripRoom(client, payload);

    return { success: true };
  }

  /**
   * Broadcast location updates to trip room if user is in an active trip
   */
  private async broadcastLocationToTripRoom(
    client: Socket,
    location: LocationDto,
  ) {
    try {
      const userId = client.data.userId;
      const userType = client.data.userType;

      if (!userId) return;

      // Check if user is in any trip rooms
      const rooms = Array.from(client.rooms);
      const tripRooms = rooms.filter((room) => room.startsWith('trip:'));

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

        this.logger.debug(
          `Broadcasted ${userType} location to trip room ${room}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error broadcasting location to trip room: ${error.message}`,
      );
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
      client.emit('error', {
        message: 'Only drivers can update driver location',
      });
      return {
        success: false,
        message: 'Only drivers can update driver location',
      };
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
    payload: { status: DriverAvailabilityStatus },
  ) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    if (userType !== 'driver') {
      client.emit('error', {
        message: 'Only drivers can update availability status',
      });
      return {
        success: false,
        message: 'Only drivers can update availability status',
      };
    }

    this.logger.debug(
      `Driver ${userId} availability update: ${payload.status}`,
    );

    try {
      await this.driverStatusService.updateDriverAvailability(
        userId,
        payload.status,
      );

      return {
        success: true,
        status: payload.status,
      };
    } catch (error) {
      this.logger.error(
        `Error updating driver ${userId} availability: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to update availability status',
      };
    }
  }

  private async storeUserLocation(
    userId: string,
    userType: string,
    location: LocationDto,
  ) {
    try {
      await this.locationService.storeUserLocation(userId, userType, location);
    } catch (error) {
      this.logger.error(
        `Error storing location for user ${userId}: ${error.message}`,
      );
    }
  }
}
