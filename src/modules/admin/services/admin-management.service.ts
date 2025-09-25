import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminCreateResponseDto } from '../dto/admin-create-response.dto';
import { CreateNormalAdminDto } from '../dto/create-normal-admin.dto';
import { NormalAdminListResponseDto, NormalAdminListItemDto, PaginationInfoDto } from '../dto/normal-admin-list-response.dto';
import { AdminDeleteResponseDto } from '../dto/admin-delete-response.dto';
import { GetNormalAdminsQueryDto } from '../dto/get-normal-admins-query.dto';
import { AdminUser } from '../schemas/admin-user.schema';
import * as bcrypt from 'bcrypt';
import { AdminRole } from '../enums/admin-role.enum';

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

  async createNormalAdmin(createNormalAdminDto: CreateNormalAdminDto): Promise<AdminCreateResponseDto> {
    const { email, password, name, surname } = createNormalAdminDto;

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
      role: AdminRole.NORMAL_ADMIN,
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

  async getNormalAdmins(queryDto: GetNormalAdminsQueryDto): Promise<NormalAdminListResponseDto> {
    const { page = 1, limit = 10, search } = queryDto;

    const [normalAdmins, totalCount] = await Promise.all([
      this.adminUserRepository.findNormalAdmins(page, limit, search),
      this.adminUserRepository.countNormalAdmins(search)
    ]);

    const admins: NormalAdminListItemDto[] = normalAdmins.map(admin => ({
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      surname: admin.surname,
      role: admin.role,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    const pagination: PaginationInfoDto = {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return {
      admins,
      pagination,
    };
  }

  async deleteNormalAdmin(id: string): Promise<AdminDeleteResponseDto> {
    const admin = await this.adminUserRepository.findById(id);

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (admin.role === AdminRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete super admin');
    }

    if (admin.role !== AdminRole.NORMAL_ADMIN) {
      throw new BadRequestException('Can only delete normal admin users');
    }

    await this.adminUserRepository.deleteById(id);

    return {
      message: 'Normal admin deleted successfully',
      deletedId: id,
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }
}