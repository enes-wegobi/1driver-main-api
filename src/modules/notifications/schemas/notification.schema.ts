import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';
import { UserType } from 'src/common/user-type.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification extends EntityDocumentHelper {
  @Prop({ required: true })
  userId: string;

  @Prop({ enum: UserType, required: true })
  userType: UserType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, any>;

  @Prop()
  type: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
