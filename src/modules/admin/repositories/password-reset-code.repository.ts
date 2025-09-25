import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PasswordResetCode, PasswordResetCodeDocument } from '../schemas/password-reset-code.schema';

@Injectable()
export class PasswordResetCodeRepository {
  constructor(
    @InjectModel(PasswordResetCode.name)
    private passwordResetCodeModel: Model<PasswordResetCodeDocument>,
  ) {}

  async create(resetCodeData: Partial<PasswordResetCode>): Promise<PasswordResetCodeDocument> {
    const resetCode = new this.passwordResetCodeModel(resetCodeData);
    return resetCode.save();
  }

  async findValidByEmail(email: string): Promise<PasswordResetCodeDocument | null> {
    return this.passwordResetCodeModel.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async findByEmailAndCode(email: string, code: string): Promise<PasswordResetCodeDocument | null> {
    return this.passwordResetCodeModel.findOne({
      email,
      code,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  async markAsUsed(id: string): Promise<PasswordResetCodeDocument | null> {
    return this.passwordResetCodeModel.findByIdAndUpdate(
      id,
      { isUsed: true },
      { new: true },
    ).exec();
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.passwordResetCodeModel.deleteMany({ email }).exec();
  }
}