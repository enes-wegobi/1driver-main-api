import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentMethod, PaymentMethodDocument } from '../schemas/payment-method.schema';

@Injectable()
export class PaymentMethodRepository {
  constructor(
    @InjectModel(PaymentMethod.name) private paymentMethodModel: Model<PaymentMethodDocument>,
  ) {}

  async create(paymentMethod: Partial<PaymentMethod>): Promise<PaymentMethod> {
    const newPaymentMethod = new this.paymentMethodModel(paymentMethod);
    return newPaymentMethod.save();
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethodModel.findById(id).lean().exec();
  }

  async findByStripePaymentMethodId(stripePaymentMethodId: string): Promise<PaymentMethod | null> {
    return this.paymentMethodModel
      .findOne({ stripePaymentMethodId })
      .lean()
      .exec();
  }

  async findByCustomerId(customerId: string): Promise<PaymentMethod[]> {
    return this.paymentMethodModel
      .find({ customerId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async findDefaultByCustomerId(customerId: string): Promise<PaymentMethod | null> {
    return this.paymentMethodModel
      .findOne({ customerId, isDefault: true, isActive: true })
      .lean()
      .exec();
  }

  async setAsDefault(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethodModel
      .findByIdAndUpdate(id, { isDefault: true }, { new: true })
      .lean()
      .exec();
  }

  async unsetDefault(customerId: string): Promise<void> {
    await this.paymentMethodModel
      .updateMany(
        { customerId, isDefault: true },
        { isDefault: false }
      )
      .exec();
  }

  async setInactive(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethodModel
      .findByIdAndUpdate(id, { isActive: false, isDefault: false }, { new: true })
      .lean()
      .exec();
  }

  async findAnyActiveByCustomerId(customerId: string): Promise<PaymentMethod | null> {
    return this.paymentMethodModel
      .findOne({ customerId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
