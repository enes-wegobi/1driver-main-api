import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiProperty,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { WebSocketService } from './websocket.service';
import { IsNotEmpty, IsObject, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { DriverAvailabilityStatus } from './dto/driver-location.dto';

class MessageDataDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Your ride is confirmed',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Message type',
    example: 'info',
  })
  @IsString()
  type: string;
}

class SendMessageDto {
  @ApiProperty({
    description: 'Message event name',
    example: 'notification',
  })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({
    description: 'Message data to send',
    type: MessageDataDto,
  })
  @IsObject()
  @Type(() => MessageDataDto)
  data: MessageDataDto;
}

class UpdateDriverAvailabilityDto {
  @ApiProperty({
    description: 'Driver availability status',
    enum: DriverAvailabilityStatus,
    example: DriverAvailabilityStatus.AVAILABLE,
  })
  @IsEnum(DriverAvailabilityStatus)
  status: DriverAvailabilityStatus;
}

@ApiTags('websocket')
@Controller('websocket')
export class WebSocketController {
  constructor(private readonly webSocketService: WebSocketService) {}

  @Post('send/user/:userId')
  @ApiOperation({ summary: 'Send a message to a specific user' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to send the message to',
  })
  async sendMessageToUser(
    @Param('userId') userId: string,
    @Body() messageDto: SendMessageDto,
  ) {
    await this.webSocketService.sendToUser(
      userId,
      messageDto.event,
      messageDto.data,
    );
    return { success: true, message: `Message sent to user ${userId}` };
  }

  @Get('location/user/:userId')
  @ApiOperation({ summary: 'Get the location of a specific user' })
  @ApiParam({
    name: 'userId',
    description: 'ID of the user to get location for',
  })
  async getUserLocation(@Param('userId') userId: string) {
    const location = await this.webSocketService.getUserLocation(userId);
    if (!location) {
      throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
    }
    return location;
  }
/*
  @Get('location/nearby')
  @ApiOperation({ summary: 'Get users near a specific location' })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    required: false,
    default: 5,
  })
  @ApiQuery({
    name: 'userType',
    description: 'Type of users to find (driver or customer)',
    required: false,
    default: 'driver',
  })
  @ApiQuery({
    name: 'onlyAvailable',
    description: 'Only return available drivers',
    required: false,
    default: false,
  })
  async getNearbyUsers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: number = 5,
    @Query('userType') userType: string = 'driver',
    @Query('onlyAvailable') onlyAvailable: boolean = false,
  ) {
    const users = await this.webSocketService.findNearbyUsers(
      userType,
      latitude,
      longitude,
      radius,
      onlyAvailable,
    );
    return {
      total: users.length,
      users,
    };
  }
*/
  @Get('location/nearby-drivers')
  @ApiOperation({ summary: 'Get available drivers near a specific location' })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    required: false,
    default: 5,
  })
  async getNearbyAvailableDrivers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: number = 5,
  ) {
    const drivers = await this.webSocketService
      .getRedisService()
      .findNearbyAvailableDrivers(latitude, longitude, radius);
    return {
      total: drivers.length,
      drivers,
    };
  }

  @Get('drivers/active')
  @ApiOperation({ summary: 'Get all active drivers' })
  async getActiveDrivers() {
    const driverIds = await this.webSocketService
      .getRedisService()
      .getActiveDrivers();

    // Get additional information for each driver
    const drivers = await Promise.all(
      driverIds.map(async (driverId) => {
        const location = await this.webSocketService.getUserLocation(driverId);
        const status = await this.webSocketService
          .getRedisService()
          .getDriverAvailability(driverId);

        return {
          driverId,
          location,
          availabilityStatus: status,
        };
      }),
    );

    return {
      total: drivers.length,
      drivers,
    };
  }

  @Put('drivers/:driverId/availability')
  @ApiOperation({ summary: 'Update driver availability status' })
  @ApiParam({ name: 'driverId', description: 'ID of the driver to update' })
  async updateDriverAvailability(
    @Param('driverId') driverId: string,
    @Body() updateDto: UpdateDriverAvailabilityDto,
  ) {
    try {
      await this.webSocketService
        .getRedisService()
        .updateDriverAvailability(driverId, updateDto.status);

      // Notify the driver about the status change
      await this.webSocketService.sendToUser(driverId, 'availabilityUpdated', {
        status: updateDto.status,
      });

      return {
        success: true,
        driverId,
        status: updateDto.status,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to update driver availability: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get all connected clients' })
  async getConnectedClients() {
    const server = this.webSocketService.getServer();

    const sockets = await server.fetchSockets();

    const clients = sockets.map((socket) => ({
      id: socket.id,
      userType: socket.data.userType,
      userId: socket.data.userId,
      connectedAt: socket.handshake.issued,
      rooms: Array.from(socket.rooms),
    }));

    return {
      total: clients.length,
      clients,
    };
  }

  @Get('clients/customers')
  @ApiOperation({ summary: 'Get all connected customers' })
  async getConnectedCustomers() {
    const server = this.webSocketService.getServer();
    const sockets = await server.in('type:customer').fetchSockets();

    const clients = sockets.map((socket) => ({
      id: socket.id,
      userId: socket.data.userId,
      connectedAt: socket.handshake.issued,
    }));

    return {
      total: clients.length,
      clients,
    };
  }

  @Get('clients/drivers')
  @ApiOperation({ summary: 'Get all connected drivers' })
  async getConnectedDrivers() {
    const server = this.webSocketService.getServer();
    const sockets = await server.in('type:driver').fetchSockets();

    const clients = await Promise.all(
      sockets.map(async (socket) => {
        const userId = socket.data.userId;
        const status = await this.webSocketService
          .getRedisService()
          .getDriverAvailability(userId);

        return {
          id: socket.id,
          userId,
          availabilityStatus: status,
          connectedAt: socket.handshake.issued,
        };
      }),
    );

    return {
      total: clients.length,
      clients,
    };
  }
}
