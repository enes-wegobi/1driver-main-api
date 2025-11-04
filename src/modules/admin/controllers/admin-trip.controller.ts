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
import { AdminTripService } from '../services/admin-trip.service';
import { GetAdminTripsQueryDto } from '../dto/get-admin-trips-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminTripListResponseDto } from '../dto/admin-trip-list-response.dto';
import { AdminTripDetailResponseDto } from '../dto/admin-trip-detail-response.dto';
import { IdParamDto } from '../dto/id-param.dto';

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
    description: 'Trips retrieved successfully',
    type: AdminTripListResponseDto
  })
  async getAllTrips(
    @Query() query: GetAdminTripsQueryDto,
  ): Promise<AdminTripListResponseDto> {
    return this.adminTripService.getAllTrips(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get trip details by ID' })
  @ApiParam({
    name: 'id',
    description: 'Trip ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip details retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid trip ID format',
  })
  @ApiResponse({
    status: 404,
    description: 'Trip not found',
  })
  async getTripById(
    @Param() params: IdParamDto,
  ): Promise<AdminTripDetailResponseDto> {
    const trip = await this.adminTripService.getTripById(params.id);

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }
}
