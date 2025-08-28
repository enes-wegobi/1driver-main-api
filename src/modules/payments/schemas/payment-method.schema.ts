import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { EntityDocumentHelper } from 'src/common/utils/document-helper';

export type PaymentMethodDocument = PaymentMethod & Document;

@Schema({ timestamps: true })
export class PaymentMethod extends EntityDocumentHelper {
  @Prop({ required: true })
  customerId: string;

  @Prop({ required: true })
  stripePaymentMethodId: string;

  @Prop()
  name: string;

  @Prop()
  brand: string; // visa, mastercard, etc.

  @Prop()
  last4: string; // last 4 digits

  @Prop()
  expiryMonth: number;

  @Prop()
  expiryYear: number;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

// Create indexes for common queries
PaymentMethodSchema.index({ customerId: 1 });
PaymentMethodSchema.index({ stripePaymentMethodId: 1 }, { unique: true });
