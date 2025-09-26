import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminCustomerService } from '../services/admin-customer.service';
import { GetAdminCustomersQueryDto } from '../dto/get-admin-customers-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminCustomerListResponseDto } from '../dto/admin-customer-list-response.dto';
import { AdminCustomerDetailResponseDto } from '../dto/admin-customer-detail-response.dto';

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
    type: AdminCustomerListResponseDto
  })
  async getAllCustomers(@Query() query: GetAdminCustomersQueryDto): Promise<AdminCustomerListResponseDto> {
    return this.adminCustomerService.getAllCustomers(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer details by ID including addresses and payment methods' })
  @ApiResponse({
    status: 200,
    description: 'Customer details retrieved successfully',
    type: AdminCustomerDetailResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found'
  })
  async getCustomerById(@Param('id') id: string): Promise<AdminCustomerDetailResponseDto> {
    const customer = await this.adminCustomerService.getCustomerById(id);

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }
}