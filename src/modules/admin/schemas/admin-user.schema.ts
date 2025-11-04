import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';
import { AdminRole } from '../enums/admin-role.enum';

export type AdminUserDocument = AdminUser & Document;

@Schema({ timestamps: true })
export class AdminUser extends EntityDocumentHelper {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  surname: string;

  @Prop({ enum: AdminRole, default: AdminRole.NORMAL_ADMIN })
  role: AdminRole;

  @Prop({ required: true })
  phone: string;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);

AdminUserSchema.index({ email: 1 });
