import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { BaseRedisService } from 'src/redis/services/base-redis.service';
import { TripQueueService } from 'src/queue/services/trip-queue.service';
import { LoggerService } from 'src/logger/logger.service';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class HealthService {
  private isShuttingDown = false;
  private startTime = Date.now();

  constructor(
    private readonly baseRedisService: BaseRedisService,
    private readonly tripQueueService: TripQueueService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
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
    const [redisHealthy, queueHealthy] = await Promise.allSettled([
      this.checkRedisHealth(),
      this.checkQueueHealth(),
    ]);

    return {
      redis: this.getStatusFromResult(redisHealthy),
      websocket: 'healthy', // WebSocket is always healthy if app is running
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
}
