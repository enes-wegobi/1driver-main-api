import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminDriverService } from '../services/admin-driver.service';
import { GetAdminDriversQueryDto } from '../dto/get-admin-drivers-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminDriverListResponseDto } from '../dto/admin-driver-list-response.dto';
import { AdminDriverDetailResponseDto } from '../dto/admin-driver-detail-response.dto';
import { IdParamDto } from '../dto/id-param.dto';
import { RejectApplicationDto } from '../dto/reject-application.dto';
import { RequestReuploadDto } from '../dto/request-reupload.dto';
import { ApplicationActionResponseDto } from '../dto/application-action-response.dto';

@ApiTags('Admin Drivers')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/drivers')
export class AdminDriverController {
  constructor(private readonly adminDriverService: AdminDriverService) {}

  @Get()
  @ApiOperation({ summary: 'Get all drivers for admin with search' })
  @ApiResponse({
    status: 200,
    description: 'Drivers retrieved successfully',
    type: AdminDriverListResponseDto,
  })
  async getAllDrivers(
    @Query() query: GetAdminDriversQueryDto,
  ): Promise<AdminDriverListResponseDto> {
    return this.adminDriverService.getAllDrivers(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get driver details by ID including bank information and driving license',
  })
  @ApiParam({
    name: 'id',
    description: 'Driver ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver details retrieved successfully',
    type: AdminDriverDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid driver ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Driver not found',
  })
  async getDriverById(
    @Param() params: IdParamDto,
  ): Promise<AdminDriverDetailResponseDto> {
    const driver = await this.adminDriverService.getDriverById(params.id);

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all driver applications for admin' })
  @ApiResponse({
    status: 200,
    description: 'Driver applications retrieved successfully',
    type: AdminDriverListResponseDto,
  })
  async getAllApplications(
    @Query() query: GetAdminDriversQueryDto,
  ): Promise<AdminDriverListResponseDto> {
    return this.adminDriverService.getAllApplications(query);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get driver application details by ID' })
  @ApiParam({
    name: 'id',
    description: 'Driver ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver application details retrieved successfully',
    type: AdminDriverDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Driver application not found',
  })
  async getApplicationById(
    @Param() params: IdParamDto,
  ): Promise<AdminDriverDetailResponseDto> {
    const application = await this.adminDriverService.getApplicationById(params.id);

    if (!application) {
      throw new NotFoundException('Driver application not found');
    }

    return application;
  }

  @Post('applications/:id/approve')
  @ApiOperation({ summary: 'Approve driver application' })
  @ApiParam({
    name: 'id',
    description: 'Driver ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver application approved successfully',
    type: ApplicationActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Driver application not found',
  })
  async approveApplication(
    @Param() params: IdParamDto,
  ): Promise<ApplicationActionResponseDto> {
    await this.adminDriverService.approveApplication(params.id);
    return {
      success: true,
      message: 'Driver application approved successfully',
    };
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: 'Reject driver application' })
  @ApiParam({
    name: 'id',
    description: 'Driver ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Driver application rejected successfully',
    type: ApplicationActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Driver application not found',
  })
  async rejectApplication(
    @Param() params: IdParamDto,
    @Body() rejectDto: RejectApplicationDto,
  ): Promise<ApplicationActionResponseDto> {
    await this.adminDriverService.rejectApplication(params.id, rejectDto.reason);
    return {
      success: true,
      message: 'Driver application rejected successfully',
    };
  }

  @Post('applications/:id/request-reupload')
  @ApiOperation({ summary: 'Request document reupload from driver' })
  @ApiParam({
    name: 'id',
    description: 'Driver ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Document reupload request sent successfully',
    type: ApplicationActionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Driver application not found',
  })
  async requestDocumentReupload(
    @Param() params: IdParamDto,
    @Body() reuploadDto: RequestReuploadDto,
  ): Promise<ApplicationActionResponseDto> {
    await this.adminDriverService.requestDocumentReupload(params.id, reuploadDto.message);
    return {
      success: true,
      message: 'Document reupload request sent successfully',
    };
  }
}
