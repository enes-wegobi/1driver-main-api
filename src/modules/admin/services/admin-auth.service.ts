import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '../../../jwt/jwt.service';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminLoginResponseDto } from '../dto/admin-login-response.dto';
import { AdminProfileResponseDto } from '../dto/admin-profile-response.dto';
import { AdminUser } from '../schemas/admin-user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const { email, password } = loginDto;

    const admin = await this.adminUserRepository.findActiveByEmail(email);
    if (!admin) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const payload = {
      userId: admin._id.toString(),
      userType: 'admin',
      role: admin.role,
      email: admin.email,
    };

    const accessToken = await this.jwtService.generateToken(payload);

    return {
      accessToken,
      admin: {
        id: admin._id.toString(),
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        lastLoginAt: new Date(),
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async getAdminProfile(userId: string): Promise<AdminProfileResponseDto> {
    const admin = await this.adminUserRepository.findById(userId);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is inactive');
    }

    return {
      id: admin._id.toString(),
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      isActive: admin.isActive,
    };
  }

  async createAdminUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }): Promise<AdminUser> {
    const passwordHash = await this.hashPassword(userData.password);

    return this.adminUserRepository.create({
      email: userData.email,
      passwordHash,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role as any,
    });
  }
}