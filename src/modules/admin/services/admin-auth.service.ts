import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '../../../jwt/jwt.service';
import { AdminUserRepository } from '../repositories/admin-user.repository';
import { PasswordResetCodeRepository } from '../repositories/password-reset-code.repository';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminLoginResponseDto } from '../dto/admin-login-response.dto';
import { AdminProfileResponseDto } from '../dto/admin-profile-response.dto';
import { SendResetCodeDto } from '../dto/send-reset-code.dto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ResetCodeResponseDto, VerifyCodeResponseDto, ResetPasswordResponseDto } from '../dto/reset-code-response.dto';
import { AdminUser } from '../schemas/admin-user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly passwordResetCodeRepository: PasswordResetCodeRepository,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    const { email, password } = loginDto;

    const admin = await this.adminUserRepository.findByEmail(email);
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
        name: admin.name,
        surname: admin.surname,
        role: admin.role,
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

    return {
      id: admin._id.toString(),
      email: admin.email,
      name: admin.name,
      surname: admin.surname,
      role: admin.role,
    };
  }

  async createAdminUser(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
    role?: string;
  }): Promise<AdminUser> {
    const passwordHash = await this.hashPassword(userData.password);

    return this.adminUserRepository.create({
      email: userData.email,
      passwordHash,
      name: userData.name,
      surname: userData.surname,
      role: userData.role as any,
    });
  }

  async sendResetCode(sendResetCodeDto: SendResetCodeDto): Promise<ResetCodeResponseDto> {
    const { email } = sendResetCodeDto;

    const admin = await this.adminUserRepository.findByEmail(email);
    if (!admin) {
      throw new NotFoundException('Admin with this email does not exist');
    }

    await this.passwordResetCodeRepository.deleteByEmail(email);

    const resetCode = '1111';
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.passwordResetCodeRepository.create({
      email,
      code: resetCode,
      expiresAt,
    });
    //TODO send code with email

    return {
      message: 'Verification code sent to your email',
      email,
    };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto): Promise<VerifyCodeResponseDto> {
    const { email, code } = verifyResetCodeDto;

    const resetCode = await this.passwordResetCodeRepository.findByEmailAndCode(email, code);
    if (!resetCode) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return {
      message: 'Verification code is valid',
      verified: true,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const { email, code, newPassword, confirmPassword } = resetPasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const resetCode = await this.passwordResetCodeRepository.findByEmailAndCode(email, code);
    if (!resetCode) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const admin = await this.adminUserRepository.findByEmail(email);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const passwordHash = await this.hashPassword(newPassword);
    await this.adminUserRepository.updatePassword(admin._id.toString(), passwordHash);

    await this.passwordResetCodeRepository.markAsUsed(resetCode.id);

    return {
      message: 'Password has been successfully reset',
    };
  }
}