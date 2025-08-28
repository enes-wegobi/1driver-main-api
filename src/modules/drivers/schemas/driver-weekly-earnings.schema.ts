import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';

export type DriverWeeklyEarningsDocument = DriverWeeklyEarnings & Document;

@Schema({ _id: false })
export class TripEarningDetail {
  @Prop({ type: Types.ObjectId, required: true })
  tripId: Types.ObjectId;

  @Prop({ required: true })
  tripDate: Date;

  @Prop({ required: true })
  duration: number; // seconds

  @Prop({ required: true })
  multiplier: number; // rate per minute

  @Prop({ required: true })
  earnings: number;
}

export const TripEarningDetailSchema =
  SchemaFactory.createForClass(TripEarningDetail);

@Schema({ timestamps: true })
export class DriverWeeklyEarnings extends EntityDocumentHelper {
  @Prop({ required: true })
  driverId: string;

  @Prop({ required: true })
  weekStartDate: Date;

  @Prop({ required: true })
  weekEndDate: Date;

  @Prop({ default: 0 })
  totalTrips: number;

  @Prop({ default: 0 })
  totalDuration: number; // seconds

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ type: [TripEarningDetailSchema], default: [] })
  trips: TripEarningDetail[];

  @Prop({ enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' })
  status: string;

  @Prop({ enum: ['UNPAID', 'PAID'] })
  paymentStatus?: string;

  @Prop()
  paidAt?: Date;
}

export const DriverWeeklyEarningsSchema =
  SchemaFactory.createForClass(DriverWeeklyEarnings);

// Indexes for performance
DriverWeeklyEarningsSchema.index({ driverId: 1, status: 1 });
DriverWeeklyEarningsSchema.index({ status: 1, paymentStatus: 1 });
DriverWeeklyEarningsSchema.index({ weekStartDate: -1 });
DriverWeeklyEarningsSchema.index({ driverId: 1, weekStartDate: -1 });
