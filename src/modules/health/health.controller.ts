import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the application and its dependencies',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
        version: { type: 'string', example: '1.0.0' },
        dependencies: {
          type: 'object',
          properties: {
            redis: { type: 'string', example: 'healthy' },
            websocket: { type: 'string', example: 'healthy' },
            queue: { type: 'string', example: 'healthy' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Application is unhealthy',
  })
  async getHealth() {
    return await this.healthService.getHealthStatus();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check endpoint',
    description: 'Returns whether the application is ready to serve traffic',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application is ready',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Application is not ready',
  })
  async getReadiness() {
    return await this.healthService.getReadinessStatus();
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check endpoint',
    description: 'Returns whether the application is alive',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application is alive',
  })
  async getLiveness() {
    return await this.healthService.getLivenessStatus();
  }
}
