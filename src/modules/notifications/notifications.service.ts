import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationDocument } from './schemas/notification.schema';
import { WebSocketService } from 'src/websocket/websocket.service';
import { ExpoNotificationsService } from 'src/modules/expo-notifications/expo-notifications.service';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { DriversClient } from 'src/clients/driver/drivers.client';
import { LoggerService } from 'src/logger/logger.service';
import { UserType } from 'src/common/user-type.enum';
import { WebSocketRedisService } from 'src/redis/services/websocket-redis.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly websocketService: WebSocketService,
    private readonly expoNotificationsService: ExpoNotificationsService,
    private readonly customersClient: CustomersClient,
    private readonly driversClient: DriversClient,
    private readonly webSocketRedis: WebSocketRedisService,
    private readonly logger: LoggerService,
  ) {}

  async sendNotification(dto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = await this.notificationRepository.create(dto);

    this.logger.info('Notification saved to database', {
      notificationId: notification._id,
      userId: dto.userId,
      userType: dto.userType,
      type: dto.type,
    });

    const isOnline = await this.webSocketRedis.getActiveConnection(
      dto.userId,
      dto.userType,
    );

    if (isOnline) {
      try {
        await this.websocketService.sendToUser(dto.userId, 'notification', {
          id: notification._id.toString(),
          title: notification.title,
          body: notification.body,
          data: notification.data,
          type: notification.type,
        });

        this.logger.info('Notification sent via WebSocket', {
          notificationId: notification._id,
          userId: dto.userId,
        });

        return notification;
      } catch (error) {
        this.logger.warn('Failed to send WebSocket notification, falling back to Expo', {
          notificationId: notification._id,
          userId: dto.userId,
          error: error.message,
        });
      }
    }

    try {
      const user =
        dto.userType === UserType.CUSTOMER
          ? await this.customersClient.findOne(dto.userId, ['expoToken'])
          : await this.driversClient.findOne(dto.userId, ['expoToken']);

      if (user?.expoToken) {
        await this.expoNotificationsService.sendNotification(
          user.expoToken,
          notification.title,
          notification.body,
          {
            notificationId: notification._id.toString(),
            type: notification.type,
            ...notification.data,
          },
        );

        this.logger.info('Notification sent via Expo push', {
          notificationId: notification._id,
          userId: dto.userId,
        });
      } else {
        this.logger.warn('No Expo token found for user', {
          notificationId: notification._id,
          userId: dto.userId,
          userType: dto.userType,
        });
      }
    } catch (error) {
      this.logger.error('Failed to send Expo push notification', {
        notificationId: notification._id,
        userId: dto.userId,
        error: error.message,
      });
    }

    return notification;
  }

  async getUserNotifications(
    userId: string,
    userType: UserType,
    query: GetNotificationsQueryDto,
  ) {
    const { notifications, total } = await this.notificationRepository.findByUserId(
      userId,
      userType,
      query.page,
      query.limit,
    );

    return {
      notifications: notifications.map((n) => ({
        id: n._id.toString(),
        title: n.title,
        body: n.body,
        data: n.data,
        type: n.type,
        isRead: n.isRead,
        readAt: n.readAt,
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / (query.limit ?? 20)),
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
    userType: UserType,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId || notification.userType !== userType) {
      throw new ForbiddenException('You can only mark your own notifications as read');
    }

    const updated = await this.notificationRepository.markAsRead(notificationId);

    if (!updated) {
      throw new NotFoundException('Notification not found after update');
    }

    this.logger.info('Notification marked as read', {
      notificationId,
      userId,
    });

    return updated;
  }

  async markAllAsRead(userId: string, userType: UserType): Promise<{ updatedCount: number }> {
    const updatedCount = await this.notificationRepository.markAllAsRead(userId, userType);

    this.logger.info('All notifications marked as read', {
      userId,
      userType,
      updatedCount,
    });

    return { updatedCount };
  }
}
