import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminTripService } from '../services/admin-trip.service';
import { GetAdminTripsQueryDto } from '../dto/get-admin-trips-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminTripListResponseDto } from '../dto/admin-trip-list-response.dto';
import { AdminTripDetailResponseDto } from '../dto/admin-trip-detail-response.dto';

@ApiTags('Admin Trips')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/trips')
export class AdminTripController {
  constructor(private readonly adminTripService: AdminTripService) {}

  @Get()
  @ApiOperation({ summary: 'Get all trips for admin' })
  @ApiResponse({
    status: 200,
    description: 'Trips retrieved successfully'
  })
  async getAllTrips(@Query() query: GetAdminTripsQueryDto): Promise<AdminTripListResponseDto> {
    return this.adminTripService.getAllTrips(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved successfully'
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found'
  })
  async getTripById(@Param('id') id: string): Promise<AdminTripDetailResponseDto> {
    const trip = await this.adminTripService.getTripById(id);

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }
}