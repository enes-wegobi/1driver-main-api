import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

@Injectable()
export class ClientsService {
  constructor(private configService: ConfigService) {}

  createHttpClient(serviceName: string): AxiosInstance {
    const serviceConfig = this.configService.get(`services.${serviceName}`);

    if (!serviceConfig) {
      throw new Error(`Configuration not found for "${serviceName}" service`);
    }

    const config: AxiosRequestConfig = {
      baseURL: serviceConfig.url,
      timeout: serviceConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const client = axios.create(config);

    client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error(`[${serviceName}] Error:`, error.message);
        return Promise.reject(error);
      },
    );

    return client;
  }
}
