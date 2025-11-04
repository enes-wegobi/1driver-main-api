import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminLoginResponseDto } from '../dto/admin-login-response.dto';
import { AdminProfileResponseDto } from '../dto/admin-profile-response.dto';
import { SendResetCodeDto } from '../dto/send-reset-code.dto';
import { VerifyResetCodeDto } from '../dto/verify-reset-code.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import {
  ResetCodeResponseDto,
  VerifyCodeResponseDto,
  ResetPasswordResponseDto,
} from '../dto/reset-code-response.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';

@ApiTags('Admin Authentication')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged in',
    type: AdminLoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Email or password is incorrect',
  })
  async login(@Body() loginDto: AdminLoginDto): Promise<AdminLoginResponseDto> {
    return this.adminAuthService.login(loginDto);
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current admin profile' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved admin profile',
    type: AdminProfileResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  async getProfile(@Request() req): Promise<AdminProfileResponseDto> {
    const userId = req.user.userId;
    return this.adminAuthService.getAdminProfile(userId);
  }

  @Post('send-reset-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset verification code' })
  @ApiResponse({
    status: 200,
    description: 'Verification code sent successfully',
    type: ResetCodeResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Admin with this email does not exist',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin account is inactive',
  })
  async sendResetCode(
    @Body() sendResetCodeDto: SendResetCodeDto,
  ): Promise<ResetCodeResponseDto> {
    return this.adminAuthService.sendResetCode(sendResetCodeDto);
  }

  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset code' })
  @ApiResponse({
    status: 200,
    description: 'Verification code is valid',
    type: VerifyCodeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification code',
  })
  async verifyResetCode(
    @Body() verifyResetCodeDto: VerifyResetCodeDto,
  ): Promise<VerifyCodeResponseDto> {
    return this.adminAuthService.verifyResetCode(verifyResetCodeDto);
  }

  @Put('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with verification code' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid verification code or password validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return this.adminAuthService.resetPassword(resetPasswordDto);
  }
}
