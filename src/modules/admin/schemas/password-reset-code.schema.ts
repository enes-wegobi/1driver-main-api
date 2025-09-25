import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PasswordResetCodeDocument = PasswordResetCode & Document;

@Schema({ timestamps: true })
export class PasswordResetCode {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PasswordResetCodeSchema = SchemaFactory.createForClass(PasswordResetCode);