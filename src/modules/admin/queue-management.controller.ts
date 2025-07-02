import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DriverTripQueueService } from 'src/redis/services/driver-trip-queue.service';

@ApiTags('admin/queue-management')
@Controller('admin/queue-management')
export class QueueManagementController {
  constructor(
    private readonly driverTripQueueService: DriverTripQueueService,
  ) {}

  @Get('drivers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all driver IDs with queue data',
    description:
      'Returns list of all driver IDs that have any queue data (trip-queue, processing, last-request)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of driver IDs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        drivers: {
          type: 'array',
          items: { type: 'string' },
          example: ['driver1', 'driver2', 'driver3'],
        },
        count: { type: 'number', example: 3 },
      },
    },
  })
  async getAllDriversWithQueueData() {
    const drivers =
      await this.driverTripQueueService.getAllDriversWithQueueData();

    return {
      drivers,
      count: drivers.length,
    };
  }

  @Get('queues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all queue items for all drivers',
    description:
      'Returns detailed queue information for all drivers including pending trips and processing status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All queue items retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        queues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              driverId: { type: 'string', example: 'driver123' },
              queueItems: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    tripId: { type: 'string', example: 'trip456' },
                    priority: { type: 'number', example: 1 },
                    addedAt: { type: 'number', example: 1640995200000 },
                    customerLocation: {
                      type: 'object',
                      properties: {
                        lat: { type: 'number', example: 40.7128 },
                        lon: { type: 'number', example: -74.006 },
                      },
                    },
                  },
                },
              },
              currentProcessing: {
                type: 'string',
                nullable: true,
                example: 'trip789',
              },
              processingStartedAt: {
                type: 'number',
                nullable: true,
                example: 1640995200000,
              },
            },
          },
        },
        totalDrivers: { type: 'number', example: 5 },
        totalQueuedTrips: { type: 'number', example: 12 },
        totalProcessingTrips: { type: 'number', example: 3 },
      },
    },
  })
  async getAllQueueItems() {
    const queues = await this.driverTripQueueService.getAllQueueItems();

    const totalQueuedTrips = queues.reduce(
      (sum, queue) => sum + queue.queueItems.length,
      0,
    );
    const totalProcessingTrips = queues.filter(
      (queue) => queue.currentProcessing,
    ).length;

    return {
      queues,
      totalDrivers: queues.length,
      totalQueuedTrips,
      totalProcessingTrips,
    };
  }
}
