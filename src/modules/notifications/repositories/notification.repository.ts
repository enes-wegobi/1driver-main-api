import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { UserType } from 'src/common/user-type.enum';

export interface PaginatedNotifications {
  notifications: NotificationDocument[];
  total: number;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel(dto);
    const saved = await notification.save();
    return saved.toObject();
  }

  async findByUserId(
    userId: string,
    userType: UserType,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedNotifications> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find({ userId, userType })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments({ userId, userType }),
    ]);

    return { notifications, total };
  }

  async countByUserId(userId: string, userType: UserType): Promise<number> {
    return this.notificationModel.countDocuments({ userId, userType });
  }

  async markAsRead(notificationId: string): Promise<NotificationDocument | null> {
    return this.notificationModel
      .findByIdAndUpdate(
        notificationId,
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .lean();
  }

  async markAllAsRead(userId: string, userType: UserType): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, userType, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return result.modifiedCount;
  }

  async findById(notificationId: string): Promise<NotificationDocument | null> {
    return this.notificationModel.findById(notificationId).lean();
  }
}
