import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminUser, AdminUserDocument } from '../schemas/admin-user.schema';
import { AdminRole } from '../enums/admin-role.enum';

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

  async updatePassword(id: string, passwordHash: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findByIdAndUpdate(
      id,
      { passwordHash },
      { new: true },
    ).exec();
  }

  async findNormalAdmins(
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<AdminUserDocument[]> {
    const skip = (page - 1) * limit;

    let query: any = { role: AdminRole.NORMAL_ADMIN };

    if (search) {
      query = {
        ...query,
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { surname: { $regex: search, $options: 'i' } }
        ]
      };
    }

    return this.adminUserModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countNormalAdmins(search?: string): Promise<number> {
    let query: any = { role: AdminRole.NORMAL_ADMIN };

    if (search) {
      query = {
        ...query,
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { surname: { $regex: search, $options: 'i' } }
        ]
      };
    }

    return this.adminUserModel.countDocuments(query).exec();
  }

  async deleteById(id: string): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findByIdAndDelete(id).exec();
  }

  async findByIdAndRole(id: string, role: AdminRole): Promise<AdminUserDocument | null> {
    return this.adminUserModel.findOne({ _id: id, role }).exec();
  }
}