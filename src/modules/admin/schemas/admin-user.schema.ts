import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';

export type AdminUserDocument = AdminUser & Document;

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  NORMAL_ADMIN = 'normal_admin',
}

@Schema({ timestamps: true })
export class AdminUser extends EntityDocumentHelper {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ enum: AdminRole, default: AdminRole.NORMAL_ADMIN })
  role: AdminRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLoginAt: Date;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);

AdminUserSchema.index({ email: 1 });