import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminManagementService } from '../services/admin-management.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminCreateResponseDto } from '../dto/admin-create-response.dto';

@ApiTags('Admin Management')
@Controller('admin/management')
export class AdminManagementController {
  constructor(private readonly adminManagementService: AdminManagementService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new admin user' })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully',
    type: AdminCreateResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Admin with this email already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async createAdmin(@Body() createAdminDto: CreateAdminDto): Promise<AdminCreateResponseDto> {
    return this.adminManagementService.createAdmin(createAdminDto);
  }
}