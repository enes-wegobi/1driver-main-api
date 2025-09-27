import {
  Controller,
  Get,
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
}
