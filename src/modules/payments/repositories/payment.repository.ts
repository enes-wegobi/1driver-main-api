import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';

@Injectable()
export class PaymentRepository {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}
  
  async create(payment: Partial<Payment>): Promise<Payment> {
    const newPayment = new this.paymentModel(payment);
    return newPayment.save();
  }
  
  async findById(id: string): Promise<Payment | null> {
    return this.paymentModel.findById(id).exec();
  }
  
  async findByPaymentIntentId(paymentIntentId: string): Promise<Payment | null> {
    return this.paymentModel.findOne({ stripePaymentIntentId: paymentIntentId }).exec();
  }
  
  async updateStatus(id: string, status: PaymentStatus, errorMessage?: string): Promise<Payment | null> {
    return this.paymentModel.findByIdAndUpdate(
      id,
      { status, ...(errorMessage && { errorMessage }) },
      { new: true },
    ).exec();
  }
  
  async findByCustomerId(customerId: string): Promise<Payment[]> {
    return this.paymentModel.find({ customerId }).sort({ createdAt: -1 }).exec();
  }
  
  async findByTripId(tripId: string): Promise<Payment[]> {
    return this.paymentModel.find({ tripId }).exec();
  }

  async findLatestByCustomerId(customerId: string): Promise<Payment | null> {
    return this.paymentModel
      .findOne({ customerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updatePaymentIntent(id: string, stripePaymentIntentId: string): Promise<Payment | null> {
    return this.paymentModel.findByIdAndUpdate(
      id,
      { stripePaymentIntentId },
      { new: true },
    ).exec();
  }
}
