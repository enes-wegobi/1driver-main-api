import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { BaseRedisService } from 'src/redis/services/base-redis.service';
import { TripQueueService } from 'src/queue/services/trip-queue.service';
import { LoggerService } from 'src/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { WebSocketService } from 'src/websocket/websocket.service';
import { Server, Socket } from 'socket.io';

export interface HealthStatus {
  status: 'ok' | 'error' | 'shutting_down';
  timestamp: string;
  uptime: number;
  version: string;
  dependencies: {
    redis: 'healthy' | 'unhealthy' | 'unknown';
    websocket: 'healthy' | 'unhealthy' | 'unknown';
    queue: 'healthy' | 'unhealthy' | 'unknown';
  };
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready' | 'shutting_down';
  timestamp: string;
  checks: {
    redis: boolean;
    queue: boolean;
  };
}

export interface LivenessStatus {
  status: 'alive';
  timestamp: string;
  uptime: number;
}

export interface WebSocketHealthStatus {
  websocket: {
    status: 'healthy' | 'unhealthy' | 'degraded';
    server: {
      running: boolean;
      uptime: string;
    };
    connections: {
      total: number;
      drivers: number;
      customers: number;
      healthy: number;
      unhealthy: number;
    };
    performance: {
      averagePingTime: number;
      connectionErrors: number;
      lastErrorTime: string | null;
    };
    redis: {
      adapter: 'connected' | 'disconnected';
      pubClient: boolean;
      subClient: boolean;
    };
  };
}

export interface WebSocketConnection {
  socketId: string;
  userId: string;
  userType: 'driver' | 'customer';
  status: 'connected' | 'disconnecting';
  connectedAt: string;
  duration: string;
  lastPing: string;
  pingTime: number;
}

export interface WebSocketConnectionsStatus {
  summary: {
    total: number;
    byType: {
      drivers: number;
      customers: number;
    };
    byStatus: {
      connected: number;
      disconnecting: number;
    };
  };
  connections: WebSocketConnection[];
}

@Injectable()
export class HealthService {
  private isShuttingDown = false;
  private startTime = Date.now();

  constructor(
    private readonly baseRedisService: BaseRedisService,
    private readonly tripQueueService: TripQueueService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly webSocketService: WebSocketService,
  ) {}

  /**
   * Mark the application as shutting down
   */
  markAsShuttingDown(): void {
    this.isShuttingDown = true;
    this.logger.info('Health service marked application as shutting down');
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    if (this.isShuttingDown) {
      throw new HttpException(
        {
          status: 'shutting_down',
          timestamp: new Date().toISOString(),
          message: 'Application is shutting down',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const dependencies = await this.checkDependencies();
    const hasUnhealthyDependencies = Object.values(dependencies).some(
      (status) => status === 'unhealthy',
    );

    const healthStatus: HealthStatus = {
      status: hasUnhealthyDependencies ? 'error' : 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.configService.get('npm_package_version', '1.0.0'),
      dependencies,
    };

    if (hasUnhealthyDependencies) {
      throw new HttpException(healthStatus, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return healthStatus;
  }

  /**
   * Get readiness status (ready to serve traffic)
   */
  async getReadinessStatus(): Promise<ReadinessStatus> {
    if (this.isShuttingDown) {
      throw new HttpException(
        {
          status: 'shutting_down',
          timestamp: new Date().toISOString(),
          message: 'Application is shutting down',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const checks = {
      redis: await this.checkRedisHealth(),
      queue: await this.checkQueueHealth(),
    };

    const isReady = Object.values(checks).every((check) => check === true);

    const readinessStatus: ReadinessStatus = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };

    if (!isReady) {
      throw new HttpException(readinessStatus, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return readinessStatus;
  }

  /**
   * Get liveness status (application is alive)
   */
  async getLivenessStatus(): Promise<LivenessStatus> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check all dependencies health
   */
  private async checkDependencies(): Promise<HealthStatus['dependencies']> {
    const [redisHealthy, queueHealthy, websocketHealthy] = await Promise.allSettled([
      this.checkRedisHealth(),
      this.checkQueueHealth(),
      this.checkWebSocketHealth(),
    ]);

    return {
      redis: this.getStatusFromResult(redisHealthy),
      websocket: this.getStatusFromResult(websocketHealthy),
      queue: this.getStatusFromResult(queueHealthy),
    };
  }

  /**
   * Check Redis health
   */
  private async checkRedisHealth(): Promise<boolean> {
    try {
      const client = this.baseRedisService.getRedisClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Check Queue health
   */
  private async checkQueueHealth(): Promise<boolean> {
    try {
      const stats = await this.tripQueueService.getQueueStats();
      return Array.isArray(stats) && stats.length > 0;
    } catch (error) {
      this.logger.error('Queue health check failed:', error);
      return false;
    }
  }

  /**
   * Convert Promise.allSettled result to health status
   */
  private getStatusFromResult(
    result: PromiseSettledResult<boolean>,
  ): 'healthy' | 'unhealthy' | 'unknown' {
    if (result.status === 'fulfilled') {
      return result.value ? 'healthy' : 'unhealthy';
    }
    return 'unknown';
  }

  /**
   * Get WebSocket health status
   */
  async getWebSocketHealthStatus(): Promise<WebSocketHealthStatus> {
    try {
      const server = this.webSocketService.getServer();
      
      if (!server) {
        throw new HttpException(
          {
            websocket: {
              status: 'unhealthy',
              message: 'WebSocket server not initialized',
            },
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const sockets = await server.fetchSockets();
      const connections = this.analyzeConnections(sockets);
      const redisStatus = await this.checkRedisAdapterStatus();
      
      const status = this.determineWebSocketStatus(connections, redisStatus);
      const uptime = this.formatUptime(Date.now() - this.startTime);

      return {
        websocket: {
          status,
          server: {
            running: true,
            uptime,
          },
          connections: {
            total: connections.total,
            drivers: connections.drivers,
            customers: connections.customers,
            healthy: connections.healthy,
            unhealthy: connections.unhealthy,
          },
          performance: {
            averagePingTime: connections.averagePingTime,
            connectionErrors: 0, // This would need to be tracked separately
            lastErrorTime: null, // This would need to be tracked separately
          },
          redis: redisStatus,
        },
      };
    } catch (error) {
      this.logger.error('WebSocket health check failed:', error);
      throw new HttpException(
        {
          websocket: {
            status: 'unhealthy',
            message: 'WebSocket health check failed',
            error: error.message,
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get detailed WebSocket connections
   */
  async getWebSocketConnections(): Promise<WebSocketConnectionsStatus> {
    try {
      const server = this.webSocketService.getServer();
      
      if (!server) {
        throw new HttpException(
          {
            message: 'WebSocket server not initialized',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      const sockets = await server.fetchSockets();
      const connections: WebSocketConnection[] = [];
      let drivers = 0;
      let customers = 0;

      for (const socket of sockets) {
        const userType = socket.data?.userType;
        const userId = socket.data?.userId;
        
        if (userType === 'driver') drivers++;
        if (userType === 'customer') customers++;

        connections.push({
          socketId: socket.id,
          userId: userId || 'unknown',
          userType: userType || 'unknown',
          status: 'connected', // RemoteSocket objects are always connected
          connectedAt: new Date(Date.now() - 30000).toISOString(), // Approximate connection time
          duration: this.formatUptime(30000), // Approximate duration
          lastPing: new Date().toISOString(),
          pingTime: 25, // Default ping time from gateway config
        });
      }

      return {
        summary: {
          total: sockets.length,
          byType: {
            drivers,
            customers,
          },
          byStatus: {
            connected: sockets.length, // RemoteSocket objects are always connected
            disconnecting: 0,
          },
        },
        connections,
      };
    } catch (error) {
      this.logger.error('Failed to get WebSocket connections:', error);
      throw new HttpException(
        {
          message: 'Failed to get WebSocket connections',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check WebSocket health (for dependencies check)
   */
  async checkWebSocketHealth(): Promise<boolean> {
    try {
      const server = this.webSocketService.getServer();
      return server !== null && server !== undefined;
    } catch (error) {
      this.logger.error('WebSocket health check failed:', error);
      return false;
    }
  }

  /**
   * Analyze socket connections
   */
  private analyzeConnections(sockets: any[]) {
    let drivers = 0;
    let customers = 0;
    let healthy = sockets.length; // RemoteSocket objects are always connected
    let unhealthy = 0;
    let totalPingTime = 0;
    let pingCount = 0;

    for (const socket of sockets) {
      const userType = socket.data?.userType;
      
      if (userType === 'driver') drivers++;
      if (userType === 'customer') customers++;
      
      // RemoteSocket objects are always healthy/connected
      totalPingTime += 25; // Default ping time
      pingCount++;
    }

    return {
      total: sockets.length,
      drivers,
      customers,
      healthy,
      unhealthy,
      averagePingTime: pingCount > 0 ? Math.round(totalPingTime / pingCount) : 0,
    };
  }

  /**
   * Check Redis adapter status
   */
  private async checkRedisAdapterStatus() {
    try {
      const redisHealthy = await this.checkRedisHealth();
      return {
        adapter: redisHealthy ? 'connected' as const : 'disconnected' as const,
        pubClient: redisHealthy,
        subClient: redisHealthy,
      };
    } catch (error) {
      return {
        adapter: 'disconnected' as const,
        pubClient: false,
        subClient: false,
      };
    }
  }

  /**
   * Determine overall WebSocket status
   */
  private determineWebSocketStatus(
    connections: any,
    redisStatus: any,
  ): 'healthy' | 'unhealthy' | 'degraded' {
    if (!redisStatus.adapter || redisStatus.adapter === 'disconnected') {
      return 'degraded';
    }
    
    if (connections.unhealthy > connections.healthy * 0.1) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * Format uptime duration
   */
  private formatUptime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
