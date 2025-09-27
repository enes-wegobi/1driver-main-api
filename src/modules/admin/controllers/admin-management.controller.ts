import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminManagementService } from '../services/admin-management.service';
import { CreateAdminDto } from '../dto/create-admin.dto';
import { AdminCreateResponseDto } from '../dto/admin-create-response.dto';
import { CreateNormalAdminDto } from '../dto/create-normal-admin.dto';
import { NormalAdminListResponseDto } from '../dto/normal-admin-list-response.dto';
import { AdminDeleteResponseDto } from '../dto/admin-delete-response.dto';
import { GetNormalAdminsQueryDto } from '../dto/get-normal-admins-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { IdParamDto } from '../dto/id-param.dto';

@ApiTags('Admin Management')
@Controller('admin/users')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Post('super')
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
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
  ): Promise<AdminCreateResponseDto> {
    return this.adminManagementService.createAdmin(createAdminDto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new normal admin user' })
  @ApiResponse({
    status: 201,
    description: 'Normal admin created successfully',
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
  async createNormalAdmin(
    @Body() createNormalAdminDto: CreateNormalAdminDto,
  ): Promise<AdminCreateResponseDto> {
    return this.adminManagementService.createNormalAdmin(createNormalAdminDto);
  }

  @Get()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated list of normal admin users' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term for email, name or surname',
  })
  @ApiResponse({
    status: 200,
    description: 'Normal admins retrieved successfully',
    type: NormalAdminListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getNormalAdmins(
    @Query() queryDto: GetNormalAdminsQueryDto,
  ): Promise<NormalAdminListResponseDto> {
    return this.adminManagementService.getNormalAdmins(queryDto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete normal admin user' })
  @ApiParam({
    name: 'id',
    description: 'Admin user ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Normal admin deleted successfully',
    type: AdminDeleteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid admin ID format or cannot delete super admin',
  })
  @ApiResponse({
    status: 404,
    description: 'Admin not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async deleteNormalAdmin(
    @Param() params: IdParamDto,
  ): Promise<AdminDeleteResponseDto> {
    return this.adminManagementService.deleteNormalAdmin(params.id);
  }
}
