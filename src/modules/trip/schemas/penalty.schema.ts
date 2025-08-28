import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';
import { UserType } from 'src/common/user-type.enum';

export type UserPenaltyDocument = UserPenalty & Document;

export enum PenaltyType {
  DRIVER_LATE_CANCELLATION = 'DRIVER_LATE_CANCELLATION',
  CUSTOMER_NO_SHOW = 'CUSTOMER_NO_SHOW',
  CUSTOMER_LATE_CANCELLATION = 'CUSTOMER_LATE_CANCELLATION',
  DRIVER_NO_SHOW = 'DRIVER_NO_SHOW',
  INAPPROPRIATE_BEHAVIOR = 'INAPPROPRIATE_BEHAVIOR',
}

export enum PenaltyStatus {
  COMPLETED = 'COMPLETED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
}

@Schema({ timestamps: true })
export class UserPenalty extends EntityDocumentHelper {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: UserType })
  userType: UserType;

  @Prop({ required: true })
  tripId: string;

  @Prop({ required: true, enum: PenaltyType })
  penaltyType: PenaltyType;

  @Prop({ default: 0 })
  penaltyAmount: number; // 0 for driver cancellations, amount for other penalties

  @Prop()
  actionAt?: Date; // When the action that caused penalty occurred

  @Prop()
  referenceTime?: Date; // Reference time for calculations (e.g., trip acceptance time)

  @Prop()
  timeDifferenceMinutes?: number; // Time difference for late cancellations

  @Prop({ required: true, enum: PenaltyStatus })
  status: PenaltyStatus;

  @Prop()
  paidAt?: Date;

  @Prop()
  notes?: string; // Additional notes about the penalty
}

export const UserPenaltySchema = SchemaFactory.createForClass(UserPenalty);

UserPenaltySchema.index({ userId: 1, userType: 1, createdAt: -1 });
UserPenaltySchema.index({ tripId: 1 });
UserPenaltySchema.index({ userType: 1, penaltyType: 1 });
UserPenaltySchema.index({ status: 1 });
UserPenaltySchema.index({ userId: 1, status: 1 });
