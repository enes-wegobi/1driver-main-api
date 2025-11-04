import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminStatisticsService } from '../services/admin-statistics.service';
import { GetStatisticsQueryDto } from '../dto/get-statistics-query.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { AdminStatisticsResponseDto } from '../dto/admin-statistics-response.dto';

@ApiTags('Admin Statistics')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/statistics')
export class AdminStatisticsController {
  constructor(
    private readonly adminStatisticsService: AdminStatisticsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin statistics',
    description: 'Get statistics including total trips, completed trips, total drivers, total customers, and cost summaries for the specified date range (default: last 24 hours)'
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: AdminStatisticsResponseDto,
  })
  async getStatistics(
    @Query() query: GetStatisticsQueryDto,
  ): Promise<AdminStatisticsResponseDto> {
    return this.adminStatisticsService.getStatistics(query);
  }
}