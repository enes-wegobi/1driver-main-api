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
    description:
      'Returns the health status of the application and its dependencies',
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

  @Get('websocket')
  @ApiOperation({
    summary: 'WebSocket health check endpoint',
    description:
      'Returns the health status of WebSocket connections and server',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'WebSocket is healthy',
    schema: {
      type: 'object',
      properties: {
        websocket: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            server: {
              type: 'object',
              properties: {
                running: { type: 'boolean', example: true },
                uptime: { type: 'string', example: '02:15:30' },
              },
            },
            connections: {
              type: 'object',
              properties: {
                total: { type: 'number', example: 150 },
                drivers: { type: 'number', example: 85 },
                customers: { type: 'number', example: 65 },
                healthy: { type: 'number', example: 148 },
                unhealthy: { type: 'number', example: 2 },
              },
            },
            performance: {
              type: 'object',
              properties: {
                averagePingTime: { type: 'number', example: 25 },
                connectionErrors: { type: 'number', example: 0 },
                lastErrorTime: {
                  type: 'string',
                  nullable: true,
                  example: null,
                },
              },
            },
            redis: {
              type: 'object',
              properties: {
                adapter: { type: 'string', example: 'connected' },
                pubClient: { type: 'boolean', example: true },
                subClient: { type: 'boolean', example: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'WebSocket is unhealthy',
  })
  async getWebSocketHealth() {
    return await this.healthService.getWebSocketHealthStatus();
  }

  @Get('websocket/connections')
  @ApiOperation({
    summary: 'WebSocket connections endpoint',
    description:
      'Returns detailed information about active WebSocket connections',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'WebSocket connections retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 150 },
            byType: {
              type: 'object',
              properties: {
                drivers: { type: 'number', example: 85 },
                customers: { type: 'number', example: 65 },
              },
            },
            byStatus: {
              type: 'object',
              properties: {
                connected: { type: 'number', example: 148 },
                disconnecting: { type: 'number', example: 2 },
              },
            },
          },
        },
        connections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              socketId: { type: 'string', example: 'abc123' },
              userId: { type: 'string', example: 'driver_123' },
              userType: { type: 'string', example: 'driver' },
              status: { type: 'string', example: 'connected' },
              connectedAt: { type: 'string', example: '2024-01-01T10:00:00Z' },
              duration: { type: 'string', example: '00:15:30' },
              lastPing: { type: 'string', example: '2024-01-01T10:14:55Z' },
              pingTime: { type: 'number', example: 23 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'WebSocket server not available',
  })
  async getWebSocketConnections() {
    return await this.healthService.getWebSocketConnections();
  }
}
