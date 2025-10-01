import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';

export type CampaignUsageDocument = CampaignUsage & Document;

@Schema({ timestamps: true })
export class CampaignUsage extends EntityDocumentHelper {
  @Prop({ type: Types.ObjectId, ref: 'Campaign', required: true })
  campaignId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Trip', required: true })
  tripId: Types.ObjectId;

  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  discountAmount: number;

  @Prop({ required: true })
  appliedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const CampaignUsageSchema = SchemaFactory.createForClass(CampaignUsage);

CampaignUsageSchema.index({ tripId: 1 }, { unique: true });
CampaignUsageSchema.index({ campaignId: 1 });
CampaignUsageSchema.index({ customerId: 1 });
