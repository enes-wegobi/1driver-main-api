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
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { LocationService } from 'src/redis/services/location.service';
import { ActiveTripService } from 'src/redis/services/active-trip.service';
import { UserType } from 'src/common/user-type.enum';
import { TripService } from 'src/modules/trip/services/trip.service';
import { EventType } from 'src/modules/event/enum/event-type.enum';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';

const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

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
  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly locationService: LocationService,
    private readonly jwtService: JwtService,
    private readonly activeTripService: ActiveTripService,
    private readonly tripService: TripService,
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

      if (userType === UserType.DRIVER) {
        await this.driverStatusService.markDriverAsConnected(payload.userId);
        await this.driverStatusService.setDriverAppStateOnConnect(
          payload.userId,
        );

        const status = await this.driverStatusService.getDriverAvailability(
          payload.userId,
        );

        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          availabilityStatus: status,
          heartbeatInterval: HEARTBEAT_INTERVAL,
          message: 'Connection successful',
        });

        await this.driverStatusService.updateDriverHeartbeat(payload.userId);
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsActive(payload.userId);
        await this.customerStatusService.setCustomerAppStateOnConnect(
          payload.userId,
        );

        client.emit('connection', {
          status: 'connected',
          clientId: clientId,
          userType: userType,
          heartbeatInterval: HEARTBEAT_INTERVAL,
          message: 'Connection successful',
        });
        await this.customerStatusService.markCustomerAsActive(payload.userId);
      }

      this.logger.debug(
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
      if (userType === UserType.DRIVER) {
        await this.driverStatusService.markDriverAsDisconnected(userId);
        await this.driverStatusService.setDriverAppStateOnDisconnect(userId);
        const status =
          await this.driverStatusService.getDriverAvailability(userId);
        if (status !== DriverAvailabilityStatus.ON_TRIP) {
          await this.driverStatusService.updateDriverAvailability(
            userId,
            DriverAvailabilityStatus.BUSY,
          );
        }
        await this.driverStatusService.updateDriverHeartbeat(userId);
        this.logger.debug(`Driver ${userId} marked as disconnected`);
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsInactive(userId);
        await this.customerStatusService.setCustomerAppStateOnDisconnect(
          userId,
        );
        this.logger.debug(`Customer ${userId} marked as disconnected`);
      }
    }

    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('updateLocation')
  async handleDriverLocationUpdate(client: Socket, payload: LocationDto) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    this.logger.debug(
      `Driver location update from ${userId}: ${JSON.stringify(payload)}`,
    );

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

            this.logger.debug(
              `Driver ${userId} location sent to customer ${customerId} for trip ${tripId}`,
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

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(client: Socket, payload: HeartbeatDto) {
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return { success: false, message: 'User not authenticated' };
    }

    try {
      if (userType === UserType.DRIVER) {
        //avability status her haeart beatda ttl refresh olsun
        await this.driverStatusService.updateDriverHeartbeat(userId);
        await this.driverStatusService.updateDriverAppState(
          userId,
          payload.appState,
        );

        this.logger.debug(
          `Heartbeat from driver ${userId}, appState: ${payload.appState}`,
        );
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsActive(userId);
        await this.customerStatusService.updateCustomerAppState(
          userId,
          payload.appState,
        );
        this.logger.debug(
          `Heartbeat from customer ${userId}, appState: ${payload.appState}`,
        );
      }
      client.emit('heartbeat-ack', {
        timestamp: new Date().toISOString(),
        nextHeartbeatIn: HEARTBEAT_INTERVAL,
      });

      return {
        success: true,
        timestamp: new Date().toISOString(),
        nextHeartbeatIn: HEARTBEAT_INTERVAL,
      };
    } catch (error) {
      this.logger.error(
        `Error processing heartbeat from user ${userId}: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to process heartbeat',
      };
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
