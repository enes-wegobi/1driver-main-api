import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminLoginDto } from '../dto/admin-login.dto';
import { AdminLoginResponseDto } from '../dto/admin-login-response.dto';
import { AdminProfileResponseDto } from '../dto/admin-profile-response.dto';
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
}