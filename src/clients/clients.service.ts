import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import * as http from 'http';
import * as https from 'https';

@Injectable()
export class ClientsService implements OnModuleInit {
  private readonly logger = new Logger(ClientsService.name);
  private readonly clients: Map<string, AxiosInstance> = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * Initialize and warm up connections to all services when the application starts
   */
  async onModuleInit() {
    this.logger.log('Initializing and warming up connections to all services');
    const services = this.configService.get('services');

    if (services) {
      const warmupPromises = Object.keys(services).map(async (serviceName) => {
        try {
          // Create the client and store it
          const client = this.createHttpClientInternal(serviceName);
          this.clients.set(serviceName, client);

          // Attempt a health check to warm up the connection
          this.logger.log(`Warming up connection to ${serviceName} service`);
          await client.get('/health', { timeout: 5000 }).catch(() => {
            this.logger.log(
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
      this.logger.log(
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

    this.logger.log(
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

    client.interceptors.request.use(
      (config) => {
        this.logger.debug(
          `[${serviceName}] Request: ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      (error) => {
        this.logger.error(`[${serviceName}] Request error:`, error);
        return Promise.reject(error);
      },
    );

    client.interceptors.response.use(
      (response) => {
        this.logger.debug(
          `[${serviceName}] Response: ${response.status} ${response.statusText} for ${response.config.method?.toUpperCase()} ${response.config.url}`,
        );
        return response;
      },
      (error: AxiosError) => {
        const request = error.config;
        const method = request?.method?.toUpperCase() || 'UNKNOWN';
        const url = request?.url || 'UNKNOWN';

        if (error.code === 'ECONNRESET') {
          this.logger.error(
            `[${serviceName}] Connection reset for ${method} ${url}. This might indicate that the service is unavailable or overloaded.`,
          );
        } else if (error.code === 'ECONNREFUSED') {
          this.logger.error(
            `[${serviceName}] Connection refused for ${method} ${url}. The service might be down or not running.`,
          );
        } else if (error.code === 'ETIMEDOUT') {
          this.logger.error(
            `[${serviceName}] Request timeout for ${method} ${url}. The service might be slow or unresponsive.`,
          );
        } else if (error.response) {
          const responseData = error.response.data as any;
          this.logger.error(
            `[${serviceName}] HTTP error ${error.response.status} for ${method} ${url}: ${
              responseData?.message || error.message
            }`,
          );
        } else {
          this.logger.error(
            `[${serviceName}] Error for ${method} ${url}: ${error.message}`,
            error.stack,
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
          this.logger.log(
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
