import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a notification to a user' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotification(
    @Body() sendNotificationDto: SendNotificationDto,
    @GetUser() user: any,
  ) {
    // Only allow admins or the user themselves to send notifications
    if (
      user.userType !== 'admin' &&
      user.userId !== sendNotificationDto.userId
    ) {
      throw new HttpException(
        'You are not authorized to send notifications to this user',
        HttpStatus.FORBIDDEN,
      );
    }

    const result =
      await this.notificationsService.sendNotification(sendNotificationDto);

    if (!result) {
      throw new HttpException(
        'Failed to send notification',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      success: true,
      message: 'Notification sent successfully',
    };
  }

  @Post('update-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update FCM token for a user' })
  @ApiResponse({ status: 200, description: 'FCM token updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateFcmToken(
    @Body() updateFcmTokenDto: UpdateFcmTokenDto,
    @GetUser() user: any,
  ) {
    // Only allow the user themselves to update their FCM token
    if (user.userId !== updateFcmTokenDto.userId) {
      throw new HttpException(
        'You are not authorized to update FCM token for this user',
        HttpStatus.FORBIDDEN,
      );
    }

    // In a real implementation, you would store the FCM token in a database
    // For now, we'll just log it
    this.logger.log(
      `Updated FCM token for user ${updateFcmTokenDto.userId}: ${updateFcmTokenDto.fcmToken} (${updateFcmTokenDto.deviceType})`,
    );

    return {
      success: true,
      message: 'FCM token updated successfully',
    };
  }
}
