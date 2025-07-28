import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayConnection,
  OnGatewayInit,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';
import { LocationDto } from './dto/location.dto';
import { LocationService } from 'src/redis/services/location.service';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { UserType } from 'src/common/user-type.enum';
import { TripService } from 'src/modules/trip/services/trip.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';
import { LoggerService } from 'src/logger/logger.service';
import { WsJwtGuard } from '../jwt/guards/ws-jwt.guard';
import { JwtService } from 'src/jwt/jwt.service';
import { TokenManagerService } from 'src/redis/services/token-manager.service';
import { UnifiedUserRedisService } from 'src/redis/services/unified-user-redis.service';

const PING_INTERVAL = 5000;
const PING_TIMEOUT = 2000;

@NestWebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
  },
  namespace: '/',
  transports: ['websocket'],
  pingInterval: PING_INTERVAL,
  pingTimeout: PING_TIMEOUT,
  connectTimeout: 30000,
  maxHttpBufferSize: 1e6,
})
export class WebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly locationService: LocationService,
    private readonly activeTripService: ActiveTripService,
    private readonly tripService: TripService,
    private readonly logger: LoggerService,
    private readonly jwtService: JwtService,
    private readonly tokenManager: TokenManagerService,
    private readonly unifiedUserRedisService: UnifiedUserRedisService,
    
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.info('Socket.IO Server initialized with Redis Adapter');
    this.webSocketService.setServer(server);
  }

  private extractToken(client: Socket): string | null {
    // Try multiple sources for the token
    return (
      client.handshake.auth?.token ||
      client.handshake.query?.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '') ||
      null
    );
  }

  private extractDeviceId(client: Socket): string | null {
    const headerDeviceId = client.handshake.headers['x-device-id'];
    const headerDeviceIdLower =
      client.handshake.headers['x-device-id'.toLowerCase()];
    const queryDeviceId = client.handshake.query['x-device-id'];
    const authDeviceId = client.handshake.auth?.deviceId;

    return (
      (typeof headerDeviceId === 'string' ? headerDeviceId : null) ||
      (typeof headerDeviceIdLower === 'string' ? headerDeviceIdLower : null) ||
      (typeof queryDeviceId === 'string' ? queryDeviceId : null) ||
      (typeof authDeviceId === 'string' ? authDeviceId : null) ||
      null
    );
  }

  async handleConnection(client: Socket, ...args: any[]) {
    this.logger.debug(`Client connected: ${client.id}`);

    const clientId = client.id;
    const token = this.extractToken(client);
    const deviceId = this.extractDeviceId(client);

    if (!token) {
      client.emit('error', {
        message: 'Authentication required',
      });
      client.disconnect(true);
      return;
    }

    if (!deviceId) {
      client.emit('error', {
        message: 'Device ID required',
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

      const userId = payload.userId;
      const userType = payload.userType;

      if (userType !== UserType.DRIVER && userType !== UserType.CUSTOMER) {
        client.emit('error', { message: 'Invalid user type' });
        client.disconnect(true);
        return;
      }

      const activeSession = await this.tokenManager.getActiveToken(
        userId,
        userType,
      );
      if (!activeSession) {
        client.emit('error', {
          message: 'No active session found - please login again',
        });
        client.disconnect(true);
        return;
      }

      // Verify token matches the active session
      if (activeSession.token !== token) {
        client.emit('error', {
          message: 'Token mismatch - session expired or invalid',
          reason: 'token_mismatch',
        });
        client.disconnect(true);
        return;
      }

      if (activeSession.deviceId !== deviceId) {
        this.logger.warn(
          `Device ID mismatch for user ${userId}: session device ${activeSession.deviceId} vs connection device ${deviceId}`,
        );
        client.emit('error', {
          message: 'Device ID mismatch - please login with this device',
          reason: 'device_mismatch',
          sessionDeviceId: activeSession.deviceId,
          requestedDeviceId: deviceId,
        });
        client.disconnect(true);
        return;
      }

      // Store user data in the socket
      client.data.userId = userId;
      client.data.userType = userType;
      client.data.deviceId = deviceId;

      // Join rooms based on user type and ID for easier targeting
      client.join(`user:${userId}`);
      client.join(`type:${userType}`);
      client.join(`device:${deviceId}`);

      this.logger.debug(
        `[ROOM_JOIN] Client ${clientId} joined rooms: user:${userId}, type:${userType}, device:${deviceId}`,
      );

      if (userType === UserType.DRIVER) {
        // Use unified service for driver connection with single device enforcement
        const connectionResult = await this.unifiedUserRedisService.connectDriver(
          userId,
          0, // Default lat - will be updated on first location update
          0, // Default lng - will be updated on first location update
          client.id,
          deviceId,
        );

        // Handle single device enforcement
        if (connectionResult.shouldForceLogout && connectionResult.previousSocket) {
          const action = connectionResult.deviceEnforcement.action;
          if (action !== 'new_connection') {
            const forceLogoutEvent = this.unifiedUserRedisService.getForceLogoutEvent(
              action,
              connectionResult.previousSocket.deviceId,
              deviceId,
            );

            // Disconnect previous socket
            await this.webSocketService.forceLogoutUser(
              userId,
              userType,
              forceLogoutEvent.reason,
              {
                timestamp: forceLogoutEvent.timestamp,
                newDeviceId: deviceId,
              },
            );
          }
        }

        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          deviceId: deviceId,
          availabilityStatus: connectionResult.preservedAvailability,
          message: 'Authentication successful',
          timestamp: new Date().toISOString(),
          deviceEnforcement: connectionResult.deviceEnforcement,
        });
      } else if (userType === UserType.CUSTOMER) {
        // Use unified service for customer connection with single device enforcement
        const connectionResult = await this.unifiedUserRedisService.connectCustomer(
          userId,
          client.id,
          deviceId,
        );

        // Handle single device enforcement
        if (connectionResult.shouldForceLogout && connectionResult.previousSocket) {
          const action = connectionResult.deviceEnforcement.action;
          if (action !== 'new_connection') {
            const forceLogoutEvent = this.unifiedUserRedisService.getForceLogoutEvent(
              action,
              connectionResult.previousSocket.deviceId,
              deviceId,
            );

            // Disconnect previous socket
            await this.webSocketService.forceLogoutUser(
              userId,
              userType,
              forceLogoutEvent.reason,
              {
                timestamp: forceLogoutEvent.timestamp,
                newDeviceId: deviceId,
              },
            );
          }
        }
        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          deviceId: deviceId,
          message: 'Authentication successful',
          timestamp: new Date().toISOString(),
          deviceEnforcement: connectionResult.deviceEnforcement,
        });
      }

      this.logger.info(
        `Client ${clientId} authenticated as ${userType} with userId: ${userId}, deviceId: ${deviceId}`,
      );

      this.logger.info(`WebSocket client authenticated successfully`, {
        clientId,
        userId: userId,
        userType,
        deviceId,
        connectionTime: new Date().toISOString(),
        hasExistingConnection: false, // This will be enhanced in registerUserConnection
      });
    } catch (error) {
      this.logger.error('WebSocket authentication error', {
        clientId: client.id,
        error: error.message,
        stack: error.stack,
        token: token ? 'provided' : 'missing',
        deviceId: deviceId || 'missing',
      });
      client.emit('error', {
        message: 'Authentication failed',
        reason: 'server_error',
        timestamp: new Date().toISOString(),
      });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const userType = client.data.userType;
    const deviceId = client.data.deviceId;

    if (userId) {
      if (userType === UserType.DRIVER) {
        // Get current app state for smart disconnect
        const currentData = await this.unifiedUserRedisService.getDriverStatus(userId);
        const appState = currentData?.appState;

        // Use unified disconnect with smart state preservation
        await this.unifiedUserRedisService.disconnectDriver(
          userId, 
          client.id, 
          appState
        );

        this.logger.info(`Driver disconnected with smart state handling`, {
          userId,
          deviceId,
          clientId: client.id,
          appState,
          disconnectionTime: new Date().toISOString(),
        });
      } else if (userType === UserType.CUSTOMER) {
        // Use unified disconnect with immediate cleanup
        await this.unifiedUserRedisService.disconnectCustomer(userId, client.id);

        this.logger.info(`Customer disconnected with immediate cleanup`, {
          userId,
          deviceId,
          clientId: client.id,
          disconnectionTime: new Date().toISOString(),
        });
      }
    }

    this.logger.info(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('updateLocation')
  @UseGuards(WsJwtGuard)
  async handleDriverLocationUpdate(client: Socket, payload: LocationDto) {
    const userId = client.data.userId;
    const userType = client.data.userType;
    const deviceId = client.data.deviceId;

    // Update user activity
    await this.unifiedUserRedisService.updateUserActivity(userId, userType);


    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    try {
      if (userType === UserType.DRIVER) {
        const tripId = await this.activeTripService.getUserActiveTripIfExists(
          userId,
          UserType.DRIVER,
        );

        if (tripId) {
          const tripDetails = await this.tripService.findById(tripId);

          if (tripDetails && tripDetails.customer && tripDetails.customer.id) {
            const customerId = tripDetails.customer.id;

            this.webSocketService.sendToUser(
              customerId,
              EventType.DRIVER_LOCATION_UPDATED,
              {
                tripId,
                driverId: userId,
                location: payload,
                timestamp: new Date().toISOString(),
              },
            );
          }
        }
      }

      // Store location to redis
      this.storeUserLocation(userId, userType, payload);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing driver location update: ${error.message}`,
      );
      return { success: false, message: 'Failed to process location update' };
    }
  }

  @SubscribeMessage('updateDriverAvailability')
  @UseGuards(WsJwtGuard)
  async handleDriverAvailabilityUpdate(
    client: Socket,
    payload: { status: DriverAvailabilityStatus },
  ) {
    const userId = client.data.userId;
    const userType = client.data.userType;
    const deviceId = client.data.deviceId;

    // Update user activity
    await this.unifiedUserRedisService.updateUserActivity(userId, userType);

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    if (userType !== UserType.DRIVER) {
      client.emit('error', {
        message: 'Only drivers can update availability status',
      });
      return {
        success: false,
        message: 'Only drivers can update availability status',
      };
    }

    // Only allow ON_TRIP and AVAILABLE status changes from drivers
    if (payload.status === DriverAvailabilityStatus.ON_TRIP) {
      client.emit('error', {
        message: 'ON_TRIP status is controlled by the trip system',
      });
      return {
        success: false,
        message: 'ON_TRIP status is controlled by the trip system',
      };
    }

    this.logger.debug(
      `Driver ${userId} availability update: ${payload.status}`,
    );

    try {
      // Check if driver can change availability
      const validation = await this.unifiedUserRedisService.canChangeAvailability(
        userId,
        payload.status,
      );

      if (!validation.canChange) {
        client.emit('error', { message: validation.reason });
        return {
          success: false,
          message: validation.reason,
        };
      }

      await this.unifiedUserRedisService.updateDriverAvailability(
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
