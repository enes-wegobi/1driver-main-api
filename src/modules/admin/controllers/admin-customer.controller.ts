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
import { AdminCustomerService } from '../services/admin-customer.service';
import { GetAdminCustomersQueryDto } from '../dto/get-admin-customers-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminCustomerListResponseDto } from '../dto/admin-customer-list-response.dto';
import { AdminCustomerDetailResponseDto } from '../dto/admin-customer-detail-response.dto';
import { IdParamDto } from '../dto/id-param.dto';

@ApiTags('Admin Customers')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/customers')
export class AdminCustomerController {
  constructor(private readonly adminCustomerService: AdminCustomerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all customers for admin with search' })
  @ApiResponse({
    status: 200,
    description: 'Customers retrieved successfully',
    type: AdminCustomerListResponseDto,
  })
  async getAllCustomers(
    @Query() query: GetAdminCustomersQueryDto,
  ): Promise<AdminCustomerListResponseDto> {
    return this.adminCustomerService.getAllCustomers(query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get customer details by ID including addresses and payment methods',
  })
  @ApiParam({
    name: 'id',
    description: 'Customer ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer details retrieved successfully',
    type: AdminCustomerDetailResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid customer ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async getCustomerById(
    @Param() params: IdParamDto,
  ): Promise<AdminCustomerDetailResponseDto> {
    const customer = await this.adminCustomerService.getCustomerById(params.id);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }
}
