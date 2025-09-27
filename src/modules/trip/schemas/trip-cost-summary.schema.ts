import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';

export type TripCostSummaryDocument = TripCostSummary & Document;

@Schema({ timestamps: true })
export class TripCostSummary extends EntityDocumentHelper {
  @Prop({ type: Types.ObjectId, ref: 'Trip', required: true, unique: true })
  tripId: Types.ObjectId;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  driverId: string;

  @Prop({ required: true })
  finalCost: number;

  @Prop({ required: true })
  completedAt: Date;
}

export const TripCostSummarySchema = SchemaFactory.createForClass(TripCostSummary);

TripCostSummarySchema.index({ tripId: 1 }, { unique: true });
TripCostSummarySchema.index({ customerId: 1, completedAt: -1 });
TripCostSummarySchema.index({ driverId: 1, completedAt: -1 });
TripCostSummarySchema.index({ completedAt: -1 });