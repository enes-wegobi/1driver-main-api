import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import * as http from 'http';
import * as https from 'https';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ClientsService implements OnModuleInit {
  private readonly clients: Map<string, AxiosInstance> = new Map();

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {}

  /**
   * Initialize and warm up connections to all services when the application starts
   */
  async onModuleInit() {
    this.logger.info('Initializing and warming up connections to all services');
    const services = this.configService.get('services');

    if (services) {
      const warmupPromises = Object.keys(services).map(async (serviceName) => {
        try {
          // Create the client and store it
          const client = this.createHttpClientInternal(serviceName);
          this.clients.set(serviceName, client);

          // Attempt a health check to warm up the connection
          this.logger.info(`Warming up connection to ${serviceName} service`);
          await client.get('/health', { timeout: 5000 }).catch(() => {
            this.logger.info(
              `Initial connection attempt to ${serviceName} completed`,
            );
          });

          return { serviceName, success: true };
        } catch (error) {
          this.logger.warn(
            `Failed to warm up connection to ${serviceName}, but continuing anyway: ${error.message}`,
          );
          return { serviceName, success: false, error: error.message };
        }
      });

      const results = await Promise.allSettled(warmupPromises);
      this.logger.info(
        `Connection warm-up completed for ${results.length} services`,
      );
    } else {
      this.logger.warn('No services configured for connection warm-up');
    }
  }

  /**
   * Creates or returns an existing HTTP client for the specified service with retry capabilities
   */
  createHttpClient(serviceName: string): AxiosInstance {
    // Return existing client if available
    if (this.clients.has(serviceName)) {
      return this.clients.get(serviceName)!;
    }

    // Create a new client and store it
    const client = this.createHttpClientInternal(serviceName);
    this.clients.set(serviceName, client);
    return client;
  }

  /**
   * Internal method to create an HTTP client without caching
   */
  private createHttpClientInternal(serviceName: string): AxiosInstance {
    const serviceConfig = this.configService.get(`services.${serviceName}`);

    if (!serviceConfig) {
      throw new Error(`Configuration not found for "${serviceName}" service`);
    }

    this.logger.info(
      `Creating HTTP client for ${serviceName} with URL: ${serviceConfig.url} and timeout: ${serviceConfig.timeout}ms`,
    );

    const config: AxiosRequestConfig = {
      baseURL: serviceConfig.url,
      timeout: serviceConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        Connection: 'keep-alive',
      },
      // Add HTTP agents with keepAlive enabled
      httpAgent: new http.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000, // 30 seconds
      }),
      httpsAgent: new https.Agent({
        keepAlive: true,
        keepAliveMsecs: 30000, // 30 seconds
      }),
    };

    const client = axios.create(config);

    // Request interceptor - add request ID and start time
    client.interceptors.request.use(
      (config) => {
        // Add start time for duration calculation
        (config as any).startTime = Date.now();

        // Forward request ID if available in headers
        const requestId = config.headers['x-request-id'];

        this.logger.info(
          `[${serviceName}] Request started: ${config.method?.toUpperCase()} ${config.url}`,
          {
            requestId: requestId as string,
            serviceName,
            method: config.method?.toUpperCase(),
            url: config.url,
          },
        );

        return config;
      },
      (error) => {
        this.logger.error(`[${serviceName}] Request error: ${error.message}`, {
          serviceName,
          error: error.message,
        });
        return Promise.reject(error);
      },
    );

    // Response interceptor - log service calls with duration
    client.interceptors.response.use(
      (response) => {
        const duration = Date.now() - (response.config as any).startTime;
        const requestId = response.config.headers['x-request-id'] as string;
        /*
        this.logger.logServiceCall(
          serviceName,
          response.config.method?.toUpperCase() || 'UNKNOWN',
          response.config.url || 'UNKNOWN',
          response.status,
          duration,
          requestId || 'unknown',
        );
        */

        return response;
      },
      (error: AxiosError) => {
        const request = error.config;
        const method = request?.method?.toUpperCase() || 'UNKNOWN';
        const url = request?.url || 'UNKNOWN';
        const duration = request ? Date.now() - (request as any).startTime : 0;
        const requestId = request?.headers['x-request-id'] as string;

        // Log service call even for errors
        /*
        this.logger.logServiceCall(
          serviceName,
          method,
          url,
          error.response?.status || 0,
          duration,
          requestId || 'unknown',
        );
        */
        // Log detailed error
        if (error.code === 'ECONNRESET') {
          this.logger.error(
            `[${serviceName}] Connection reset for ${method} ${url}`,
            { requestId, serviceName, method, url, error: 'ECONNRESET' },
          );
        } else if (error.code === 'ECONNREFUSED') {
          this.logger.error(
            `[${serviceName}] Connection refused for ${method} ${url}`,
            { requestId, serviceName, method, url, error: 'ECONNREFUSED' },
          );
        } else if (error.code === 'ETIMEDOUT') {
          this.logger.error(
            `[${serviceName}] Request timeout for ${method} ${url}`,
            { requestId, serviceName, method, url, error: 'ETIMEDOUT' },
          );
        } else if (error.response) {
          const responseData = error.response.data as any;
          this.logger.error(
            `[${serviceName}] HTTP error ${error.response.status} for ${method} ${url}: ${responseData?.message || error.message}`,
            {
              requestId,
              serviceName,
              method,
              url,
              statusCode: error.response.status,
              error: responseData?.message || error.message,
            },
          );
        } else {
          this.logger.error(
            `[${serviceName}] Error for ${method} ${url}: ${error.message}`,
            { requestId, serviceName, method, url, error: error.message },
          );
        }

        return Promise.reject(error);
      },
    );

    // Add retry capabilities to the client
    const originalRequest = client.request;
    client.request = async (config) => {
      const serviceConfig = this.configService.get(`services.${serviceName}`);
      const retryConfig = {
        count:
          serviceConfig?.retryCount ||
          this.configService.get('retry.defaultCount') ||
          3,
        delay:
          serviceConfig?.retryDelay ||
          this.configService.get('retry.defaultDelay') ||
          1000,
      };

      return this.executeWithRetry(
        () => originalRequest(config),
        serviceName,
        retryConfig.count,
        retryConfig.delay,
      );
    };

    return client;
  }

  /**
   * Executes a function with retry logic
   * @param fn The function to execute
   * @param serviceName The name of the service (for logging)
   * @param retryCount Maximum number of retry attempts
   * @param retryDelay Initial delay between retries in milliseconds
   * @returns The result of the function
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    serviceName: string,
    retryCount = 3,
    retryDelay = 1000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= retryCount; attempt++) {
      try {
        if (attempt > 1) {
          this.logger.info(
            `Retry attempt ${attempt}/${retryCount} for ${serviceName}`,
          );
        }
        return await fn();
      } catch (error) {
        lastError = error;
        const isAxiosError = error.isAxiosError;
        const isConnectionError =
          isAxiosError &&
          (error.code === 'ECONNRESET' ||
            error.code === 'ECONNREFUSED' ||
            error.code === 'ETIMEDOUT');
        const isTimeoutError =
          error.message && error.message.includes('timeout');

        if ((isConnectionError || isTimeoutError) && attempt < retryCount) {
          this.logger.warn(
            `Error in ${serviceName} (attempt ${attempt}/${retryCount}): ${error.message}. Retrying in ${retryDelay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          // Exponential backoff with jitter
          retryDelay = retryDelay * 2 * (0.5 + Math.random() * 0.5);
        } else {
          throw error;
        }
      }
    }

    throw lastError;
  }
}
