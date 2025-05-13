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
import { ExpoNotificationsService } from './expo-notifications.service';
import { UpdateExpoTokenDto } from './dto/update-expo-token.dto';
import { SendExpoNotificationDto } from './dto/send-expo-notification.dto';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';

@ApiTags('expo-notifications')
@Controller('expo-notifications')
export class ExpoNotificationsController {
  private readonly logger = new Logger(ExpoNotificationsController.name);

  constructor(
    private readonly expoNotificationsService: ExpoNotificationsService,
  ) {}

  @Post('update-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Expo push token for a user' })
  @ApiResponse({ status: 200, description: 'Expo token updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateExpoToken(
    @Body() updateExpoTokenDto: UpdateExpoTokenDto,
    @GetUser() user: any,
  ) {
    // Only allow the user themselves to update their Expo token
    if (user.userId !== updateExpoTokenDto.userId) {
      throw new HttpException(
        'You are not authorized to update Expo token for this user',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      success: true,
      message: 'Expo token updated successfully',
    };
  }

  @Post('send')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a notification via Expo' })
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendNotification(
    @Body() sendExpoNotificationDto: SendExpoNotificationDto,
    @GetUser() user: any,
  ) {
    // Only allow admins or the user themselves to send notifications
    if (
      user.userType !== 'admin' &&
      user.userId !== sendExpoNotificationDto.userId
    ) {
      throw new HttpException(
        'You are not authorized to send notifications to this user',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.expoNotificationsService.sendNotification(
      sendExpoNotificationDto.expoToken,
      sendExpoNotificationDto.title,
      sendExpoNotificationDto.body,
      sendExpoNotificationDto.data,
    );

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
}
