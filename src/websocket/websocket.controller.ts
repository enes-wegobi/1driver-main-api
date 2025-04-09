import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { WebSocketService } from './websocket.service';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';

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

  // İhtiyaç duyarsanız daha fazla alan ekleyebilirsiniz
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

@ApiTags('websocket')
@Controller('websocket')
export class WebSocketController {
  constructor(private readonly webSocketService: WebSocketService) {}

  @Post('send/user/:userId')
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
  async getUserLocation(@Param('userId') userId: string) {
    const location = await this.webSocketService.getUserLocation(userId);
    if (!location) {
      throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
    }
    return location;
  }

  @Get('location/nearby')
  async getNearbyUsers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: number = 5,
    @Query('userType') userType: string = 'driver',
  ) {
    const users = await this.webSocketService.findNearbyUsers(
      userType,
      latitude,
      longitude,
      radius,
    );
    return {
      total: users.length,
      users,
    };
  }

  @Get('clients')
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
  async getConnectedDrivers() {
    const server = this.webSocketService.getServer();
    const sockets = await server.in('type:driver').fetchSockets();

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
}
