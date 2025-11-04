import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';
import { CampaignType, CampaignTargetGroup } from '../enums';

export type CampaignDocument = Campaign & Document;

@Schema({ timestamps: true })
export class Campaign extends EntityDocumentHelper {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ enum: CampaignType, required: true })
  type: CampaignType;

  @Prop({ required: false })
  imageUrl?: string;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ enum: CampaignTargetGroup, required: true })
  targetGroup: CampaignTargetGroup;

  @Prop({ required: false })
  description?: string;

  get status(): string {
    return new Date() > this.endDate ? 'INACTIVE' : 'ACTIVE';
  }
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

CampaignSchema.index({ code: 1 });
CampaignSchema.index({ startDate: 1, endDate: 1 });
CampaignSchema.index({ targetGroup: 1 });

CampaignSchema.virtual('status').get(function () {
  return new Date() > this.endDate ? 'INACTIVE' : 'ACTIVE';
});

CampaignSchema.set('toJSON', { virtuals: true });
CampaignSchema.set('toObject', { virtuals: true });
