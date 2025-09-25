import { Injectable, ConflictException } from '@nestjs/common';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminCreateResponseDto } from '../dto/admin-create-response.dto';
import { AdminRole, AdminUser } from '../schemas/admin-user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminManagementService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
  ) {}

  async createAdmin(createAdminDto: CreateAdminDto): Promise<AdminCreateResponseDto> {
    const { email, password, name, surname, role = AdminRole.NORMAL_ADMIN } = createAdminDto;

    const existingAdmin = await this.adminUserRepository.findByEmail(email);
    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists');
    }

    const passwordHash = await this.hashPassword(password);

    const adminData: Partial<AdminUser> = {
      email,
      passwordHash,
      name,
      surname,
      role,
      isActive: true,
    };

    const createdAdmin = await this.adminUserRepository.create(adminData);

    return {
      id: createdAdmin._id.toString(),
      email: createdAdmin.email,
      name: createdAdmin.name,
      surname: createdAdmin.surname,
      role: createdAdmin.role,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
}