import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PaginatedNotificationsResponseDto } from './dto/paginated-notifications-response.dto';
import { MarkAllReadResponseDto } from './dto/mark-all-read-response.dto';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user notifications (paginated)',
    description: 'Retrieve paginated list of notifications for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: PaginatedNotificationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotifications(
    @GetUser() user: IJwtPayload,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationsService.getUserNotifications(
      user.userId,
      user.userType,
      query,
    );
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a notification as read',
    description: 'Mark a single notification as read by ID',
  })
  @ApiParam({ name: 'id', description: 'Notification ID', example: '675c85b092f23af106ba2d52' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not your notification' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(@Param('id') id: string, @GetUser() user: IJwtPayload) {
    return this.notificationsService.markAsRead(id, user.userId, user.userType);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications as read for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    type: MarkAllReadResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@GetUser() user: IJwtPayload) {
    return this.notificationsService.markAllAsRead(user.userId, user.userType);
  }

  @Post('send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send notification to user (Test endpoint)',
    description: 'Send a test notification to any user by userId. No authentication required for testing.',
  })
  @ApiBody({ type: CreateNotificationDto })
  @ApiResponse({
    status: 201,
    description: 'Notification sent successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid input' })
  async sendNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }
}
