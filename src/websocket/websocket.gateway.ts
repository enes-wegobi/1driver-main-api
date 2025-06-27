import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayConnection,
  OnGatewayInit,
  OnGatewayDisconnect,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';
import { JwtService } from 'src/jwt/jwt.service';
import { LocationDto } from './dto/location.dto';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { LocationService } from 'src/redis/services/location.service';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { UserType } from 'src/common/user-type.enum';
import { TripService } from 'src/modules/trip/services/trip.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';
import { LoggerService } from 'src/logger/logger.service';

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
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly locationService: LocationService,
    private readonly jwtService: JwtService,
    private readonly activeTripService: ActiveTripService,
    private readonly tripService: TripService,
    private readonly logger: LoggerService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.info('Socket.IO Server initialized with Redis Adapter');
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
      if (userType !== UserType.DRIVER && userType !== UserType.CUSTOMER) {
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
      
      this.logger.debug(`[ROOM_JOIN] Client ${clientId} joined rooms: user:${payload.userId}, type:${userType}`);

      if (userType === UserType.DRIVER) {
        await this.driverStatusService.markDriverAsConnected(payload.userId);
        await this.driverStatusService.setDriverAppStateOnConnect(
          payload.userId,
        );

        await this.driverStatusService.updateDriverAvailability(
          payload.userId,
          DriverAvailabilityStatus.BUSY,
        );

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
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsActive(payload.userId);
        await this.customerStatusService.setCustomerAppStateOnConnect(
          payload.userId,
        );

        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          message: 'Connection successful',
        });
      }

      this.logger.debug(
        `Client ${clientId} authenticated as ${userType} with userId: ${payload.userId}`,
      );

      // Listen to built-in ping/pong events for logging
      client.on('ping', () => {
        this.logger.debug(`[PING] Received from ${userType}:${payload.userId} (${clientId})`);
      });

      client.on('pong', (latency) => {
        this.logger.debug(`[PONG] Received from ${userType}:${payload.userId} (${clientId}), latency: ${latency}ms`);
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
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (userId) {
      if (userType === UserType.DRIVER) {
        await this.driverStatusService.markDriverAsDisconnected(userId);
        await this.driverStatusService.setDriverAppStateOnDisconnect(userId);
        const status =
          await this.driverStatusService.getDriverAvailability(userId);
        if (status !== DriverAvailabilityStatus.ON_TRIP) {
          await this.driverStatusService.deleteDriverAvailability(userId);
        }
        this.logger.debug(`Driver ${userId} marked as disconnected`);
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsInactive(userId);
        await this.customerStatusService.setCustomerAppStateOnDisconnect(
          userId,
        );
        this.logger.debug(`Customer ${userId} marked as disconnected`);
      }
    }

    this.logger.info(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('updateLocation')
  async handleDriverLocationUpdate(client: Socket, payload: LocationDto) {
    const userId = client.data.userId;
    const userType = client.data.userType;

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
      const validation = await this.driverStatusService.canChangeAvailability(
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
/*
  @SubscribeMessage('eventAck')
  async handleEventAck(client: Socket, payload: EventAckPayload) {
    const userId = client.data.userId;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    try {
      await this.keyspaceEventService.removeTTLKey(userId, payload.eventId);

      this.logger.debug(
        `Event acknowledged and TTL key cleaned: ${payload.eventId}`,
        {
          eventId: payload.eventId,
          userId,
        },
      );

      return {
        success: true,
        eventId: payload.eventId,
      };
    } catch (error) {
      this.logger.error(
        `Error processing ACK for event ${payload.eventId}: ${error.message}`,
      );
      return {
        success: false,
        eventId: payload.eventId,
        message: 'Failed to process acknowledgment',
      };
    }
  }
*/
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
