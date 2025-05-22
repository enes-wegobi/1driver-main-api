import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment extends EntityDocumentHelper {
  @Prop({ required: true })
  customerId: string;
  
  @Prop()
  tripId: string;
  
  @Prop({ required: true })
  amount: number;
  
  @Prop({ default: 'usd' })
  currency: string;
  
  @Prop()
  paymentMethodId: string;
  
  @Prop()
  stripePaymentIntentId: string;
  
  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;
  
  @Prop()
  errorMessage: string;
  
  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Create indexes for common queries
PaymentSchema.index({ customerId: 1 });
PaymentSchema.index({ tripId: 1 });
PaymentSchema.index({ stripePaymentIntentId: 1 }, { unique: true, sparse: true });
