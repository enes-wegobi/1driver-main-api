import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminUser, AdminUserDocument } from '../schemas/admin-user.schema';

@Injectable()
export class AdminUserRepository {
  constructor(
    @InjectModel(AdminUser.name)
    private adminUserModel: Model<AdminUserDocument>,
  ) {}

  async create(adminUserData: Partial<AdminUser>): Promise<AdminUserDocument> {
    const adminUser = new this.adminUserModel(adminUserData);
    return adminUser.save();
  }

  async findByEmail(email: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findById(id).exec();
  }

  async findActiveByEmail(email: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ email, isActive: true }).exec();
  }

  async updatePassword(id: string, passwordHash: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findByIdAndUpdate(
      id,
      { passwordHash },
      { new: true },
    ).exec();
  }
}