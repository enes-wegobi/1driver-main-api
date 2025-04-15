# Table of Contents
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\app.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\main.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\clients.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\clients.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\config.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\config.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\configuration.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\validation.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt-payload.interface.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt.guard.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt.modulte.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\user.decoretor.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\redis\redis.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\redis\redis.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3-file-type.enum.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3.controller.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.controller.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.gateway.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\auth.client.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\gender.enum.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\customers.client.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\driver\drivers.client.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\users\users.client.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\users\users.interfaces.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\create-customer.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\create-vehicle.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\signin.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\validate-otp.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\complete-email-update.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\complete-phone-update.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\create-address.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\initiate-email-update.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\initiate-phone-update.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\update-customer.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\users\dto\notify-file-uploaded.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\auth\auth.controller.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\auth\auth.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\auth\auth.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\content.controller.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\content.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\content.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\customers\customers.controller.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\customers\customers.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\customers\customers.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\drivers\drivers.controller.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\drivers\drivers.module.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\drivers\drivers.service.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\dto\faq.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\dto\upload-file.dto.ts
- C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\dto\location.dto.ts

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\app.module.ts

- Extension: .ts
- Language: typescript
- Size: 781 bytes
- Created: 2025-03-24 23:25:05
- Modified: 2025-04-16 00:43:12

### Code

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from './jwt/jwt.modulte';
import { CustomersModule } from './modules/customers/customers.module';
import { ContentModule } from './modules/content/content.module';
import { WebSocketModule } from './websocket/websocket.module';
import { RedisModule } from './redis/redis.module';
import { S3Module } from './s3/s3.module';
import { DriversModule } from './modules/drivers/drivers.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule,
    AuthModule,
    CustomersModule,
    ContentModule,
    WebSocketModule,
    RedisModule,
    S3Module,
    DriversModule,
  ],
})
export class AppModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\main.ts

- Extension: .ts
- Language: typescript
- Size: 3898 bytes
- Created: 2025-03-24 23:25:05
- Modified: 2025-04-15 19:26:28

### Code

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

class FastifySocketIORedisAdapter extends IoAdapter {
  private pubClient: any;
  private subClient: any;

  constructor(app) {
    super(app);
  }

  async connectToRedis(redisUrl: string) {
    this.pubClient = createClient({ url: redisUrl });
    this.subClient = this.pubClient.duplicate();

    await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

    this.pubClient.on('error', (err) =>
      console.error('Redis Pub Client Error', err),
    );
    this.subClient.on('error', (err) =>
      console.error('Redis Sub Client Error', err),
    );

    console.log('Redis adapter clients connected');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = this.httpServer;
    const io = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      serverFactory: (handler) => handler(server),
    });

    if (this.pubClient && this.subClient) {
      const redisAdapter = createAdapter(this.pubClient, this.subClient);
      io.adapter(redisAdapter);
      console.log('Redis adapter applied to Socket.IO server');
    }

    return io;
  }
}

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger: ['error', 'warn', 'log', 'debug'] },
  );

  const configService = app.get(ConfigService);
  const redisUrl = configService.get<string>('redis.url', '0.0.0.0');
  const socketIOAdapter = new FastifySocketIORedisAdapter(app);
  await socketIOAdapter.connectToRedis(redisUrl);
  app.useWebSocketAdapter(socketIOAdapter);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Customer API Gateway')
    .setDescription('The Customer API Gateway description')
    .setVersion('1.0')
    .addTag('users')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.register(fastifyCors as any, {
    origin: configService.get<string>('CORS_ORIGINS', '*').split(','),
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  await app.register(fastifyCompress as any, {
    encodings: ['gzip', 'deflate'],
  });

  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);
  console.log(`API Gateway started: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
  console.log(`WebSocket server is running with Redis adapter`);
}

bootstrap();

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\clients.module.ts

- Extension: .ts
- Language: typescript
- Size: 656 bytes
- Created: 2025-03-25 00:16:17
- Modified: 2025-04-16 00:46:25

### Code

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsService } from './clients.service';
import { UsersClient } from './users/users.client';
import { AuthClient } from './auth/auth.client';
import { CustomersClient } from './customer/customers.client';
import { DriversClient } from './driver/drivers.client';

@Module({
  imports: [ConfigModule],
  providers: [
    ClientsService,
    UsersClient,
    AuthClient,
    CustomersClient,
    DriversClient,
  ],
  exports: [
    ClientsService,
    UsersClient,
    AuthClient,
    CustomersClient,
    DriversClient,
  ],
})
export class ClientsModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\clients.service.ts

- Extension: .ts
- Language: typescript
- Size: 1161 bytes
- Created: 2025-03-25 00:16:36
- Modified: 2025-03-25 00:27:16

### Code

```typescript
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

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\config.module.ts

- Extension: .ts
- Language: typescript
- Size: 547 bytes
- Created: 2025-04-06 23:48:46
- Modified: 2025-04-15 18:48:13

### Code

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import configuration from './configuration';
import { validate } from './validation';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\config.service.ts

- Extension: .ts
- Language: typescript
- Size: 1662 bytes
- Created: 2025-04-06 23:48:14
- Modified: 2025-04-15 19:48:11

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('port', 3000);
  }

  get host(): string {
    return this.configService.get<string>('host', '0.0.0.0');
  }

  get corsOrigins(): string {
    return this.configService.get<string>('corsOrigins', '*');
  }

  get jwtSecret(): string {
    return this.configService.get<string>('jwt.secret', 'supersecret');
  }

  get redisUrl(): string {
    return this.configService.get<string>(
      'redis.url',
      'redis://localhost:6379',
    );
  }

  get usersServiceUrl(): string {
    return this.configService.get<string>(
      'services.users.url',
      'http://localhost:3001',
    );
  }

  get usersServiceTimeout(): number {
    return this.configService.get<number>('services.users.timeout', 5000);
  }

  get authServiceUrl(): string {
    return this.configService.get<string>(
      'services.auth.url',
      'http://localhost:3001',
    );
  }

  get authServiceTimeout(): number {
    return this.configService.get<number>('services.auth.timeout', 5000);
  }

  get awsRegion(): string {
    return this.configService.get<string>('aws.region')!;
  }

  get awsAccessKeyId(): string {
    return this.configService.get<string>('aws.accessKeyId')!;
  }

  get awsSecretAccessKey(): string {
    return this.configService.get<string>('aws.secretAccessKey')!;
  }

  get awsS3BucketName(): string {
    return this.configService.get<string>('aws.s3BucketName')!;
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\configuration.ts

- Extension: .ts
- Language: typescript
- Size: 916 bytes
- Created: 2025-03-24 23:36:21
- Modified: 2025-04-15 19:34:51

### Code

```typescript
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  services: {
    users: {
      url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.USERS_SERVICE_TIMEOUT || '5000', 10),
    },
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000', 10),
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3BucketName: process.env.AWS_S3_BUCKET_NAME,
  },
});

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\config\validation.ts

- Extension: .ts
- Language: typescript
- Size: 1424 bytes
- Created: 2025-03-24 23:36:28
- Modified: 2025-04-15 19:49:08

### Code

```typescript
import { z } from 'zod';

const Environment = z.enum(['development', 'production', 'test']);

const envSchema = z.object({
  NODE_ENV: Environment.optional().default('development'),
  PORT: z.coerce.number().optional().default(3000),
  HOST: z.string().optional().default('0.0.0.0'),
  CORS_ORIGINS: z.string().optional().default('*'),
  USERS_SERVICE_URL: z.string().optional().default('http://localhost:3001'),
  USERS_SERVICE_TIMEOUT: z.coerce.number().optional().default(5000),
  AUTH_SERVICE_URL: z.string().optional().default('http://localhost:3001'),
  AUTH_SERVICE_TIMEOUT: z.coerce.number().optional().default(5000),
  PRODUCTS_SERVICE_URL: z.string().optional(),
  PRODUCTS_SERVICE_TIMEOUT: z.coerce.number().optional(),
  JWT_SECRET: z.string().optional().default('supersecret'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),
  AWS_REGION: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET_NAME: z.string(),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        'Config validation error:',
        JSON.stringify(error.format(), null, 2),
      );
      throw new Error('Configuration validation failed');
    }
    throw error;
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt-payload.interface.ts

- Extension: .ts
- Language: typescript
- Size: 163 bytes
- Created: 2025-04-15 19:38:51
- Modified: 2025-04-15 19:49:08

### Code

```typescript
export enum UserType {
  DRIVER = 'driver',
  CUSTOMER = 'customer',
}

export interface IJwtPayload {
  userId: string;
  userType: UserType;
  email?: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt.guard.ts

- Extension: .ts
- Language: typescript
- Size: 978 bytes
- Created: 2025-04-03 13:54:28
- Modified: 2025-04-03 14:58:34

### Code

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from './jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = await this.jwtService.validateToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Add the user payload to the request
    request['user'] = payload;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt.modulte.ts

- Extension: .ts
- Language: typescript
- Size: 621 bytes
- Created: 2025-04-03 13:53:06
- Modified: 2025-04-03 14:58:34

### Code

```typescript
import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: configService.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\jwt.service.ts

- Extension: .ts
- Language: typescript
- Size: 996 bytes
- Created: 2025-04-03 13:54:07
- Modified: 2025-04-03 14:58:34

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates a JWT token
   * @param token The token to validate
   * @returns The decoded token payload or null if invalid
   */
  async validateToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Decodes a JWT token without validating it
   * @param token The token to decode
   * @returns The decoded token or null if invalid format
   */
  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      return null;
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\jwt\user.decoretor.ts

- Extension: .ts
- Language: typescript
- Size: 686 bytes
- Created: 2025-04-03 13:54:49
- Modified: 2025-04-15 19:49:08

### Code

```typescript
import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { IJwtPayload } from './jwt-payload.interface';

export const GetUser = createParamDecorator(
  (
    data: keyof IJwtPayload | undefined,
    ctx: ExecutionContext,
  ): IJwtPayload | IJwtPayload[keyof IJwtPayload] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;

    if (!user) {
      console.error(
        'GetUser decorator used without a valid user object on request.',
      );
      throw new InternalServerErrorException('User not found on request');
    }

    return data ? user[data] : user;
  },
);

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\redis\redis.module.ts

- Extension: .ts
- Language: typescript
- Size: 261 bytes
- Created: 2025-04-09 11:45:00
- Modified: 2025-04-09 13:03:38

### Code

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from './redis.service';

@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\redis\redis.service.ts

- Extension: .ts
- Language: typescript
- Size: 3590 bytes
- Created: 2025-04-09 11:44:28
- Modified: 2025-04-09 15:48:11

### Code

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {
    this.client = createClient({
      url: this.configService.get<string>('redis.url'),
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.disconnect();
  }

  getRedisClient(): RedisClientType {
    return this.client;
  }

  async storeUserLocation(userId: string, userType: string, locationData: any) {
    try {
      const key = `location:user:${userId}`;
      const data = {
        ...locationData,
        userId,
        userType,
        updatedAt: new Date().toISOString(),
      };

      await this.client.set(key, JSON.stringify(data));
      await this.client.expire(key, 900);

      const geoKey = `location:${userType}:geo`;
      await this.client.geoAdd(geoKey, {
        longitude: locationData.longitude,
        latitude: locationData.latitude,
        member: userId,
      });

      return true;
    } catch (error) {
      console.error(
        `Error storing location for user ${userId}:`,
        error.message,
      );
      return false;
    }
  }

  async getUserLocation(userId: string) {
    const key = `location:user:${userId}`;
    const locationData = await this.client.get(key);
    return locationData ? JSON.parse(locationData) : null;
  }

  async findNearbyUsers(
    userType: string,
    latitude: number,
    longitude: number,
    radius: number = 5,
  ) {
    const geoKey = `location:${userType}:geo`;

    try {
      const results = await this.client.sendCommand([
        'GEORADIUS',
        geoKey,
        longitude.toString(),
        latitude.toString(),
        radius.toString(),
        'km',
        'WITHDIST',
        'WITHCOORD',
      ]);

      // Process results to get more information about each user
      const enhancedResults: any[] = [];

      if (results && Array.isArray(results)) {
        for (const result of results) {
          // Each result is an array: [userId, distance, [longitude, latitude]]
          if (
            Array.isArray(result) &&
            result.length >= 3 &&
            result[0] &&
            result[1] &&
            result[2]
          ) {
            const userId = result[0].toString();
            const distance = parseFloat(result[1].toString());
            const coords = result[2];

            // Get additional user data if available
            const userData = await this.getUserLocation(userId);

            // Create a new object with all properties
            if (
              Array.isArray(coords) &&
              coords.length >= 2 &&
              coords[0] &&
              coords[1]
            ) {
              enhancedResults.push({
                userId,
                distance,
                coordinates: {
                  longitude: parseFloat(coords[0].toString()),
                  latitude: parseFloat(coords[1].toString()),
                },
                ...(userData || {}), // Use empty object if userData is null
              });
            }
          }
        }
      }

      return enhancedResults;
    } catch (error) {
      console.error(`Error finding nearby users:`, error);
      return [];
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3-file-type.enum.ts

- Extension: .ts
- Language: typescript
- Size: 164 bytes
- Created: 2025-04-15 19:35:40
- Modified: 2025-04-15 19:49:09

### Code

```typescript
export enum S3FileType {
  DRIVERS_LICENSE_FRONT = 'driver-licence-front',
  DRIVERS_LICENSE_BACK = 'driver-licence-back',
  CRIMINAL_RECORD = 'criminal-record',
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3.controller.ts

- Extension: .ts
- Language: typescript
- Size: 1906 bytes
- Created: 2025-04-15 19:36:03
- Modified: 2025-04-15 19:49:42

### Code

```typescript
import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { S3Service } from './s3.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { v4 as uuidv4 } from 'uuid';
import { UsersClient } from 'src/clients/users/users.client';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@Controller('s3')
@UseGuards(JwtAuthGuard)
export class S3Controller {
  constructor(
    private readonly s3Service: S3Service,
    private readonly usersClient: UsersClient,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @GetUser() user: IJwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const fileKey = `${user.userId}/${uploadFileDto.fileType}/${uuidv4()}-${file.originalname}`;

      await this.s3Service.uploadFileWithKey(file, fileKey);
      await this.usersClient.notifyFileUploaded({
        userId: user.userId,
        fileType: uploadFileDto.fileType,
        fileKey: fileKey,
        fileUrl: await this.s3Service.getSignedUrl(fileKey),
      });

      return { message: 'File uploaded successfully', fileKey };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new BadRequestException('File upload failed.');
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3.module.ts

- Extension: .ts
- Language: typescript
- Size: 470 bytes
- Created: 2025-04-15 18:41:31
- Modified: 2025-04-15 19:53:16

### Code

```typescript
import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ConfigModule } from 'src/config/config.module';
import { S3Controller } from './s3.controller';
import { ClientsModule } from 'src/clients/clients.module';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ConfigModule, ClientsModule, JwtModule],
  controllers: [S3Controller],
  providers: [S3Service],
  exports: [S3Service],
})
export class S3Module {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\s3.service.ts

- Extension: .ts
- Language: typescript
- Size: 2154 bytes
- Created: 2025-04-15 18:41:31
- Modified: 2025-04-15 19:49:09

### Code

```typescript
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'src/config/config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.awsRegion;
    this.bucketName = this.configService.awsS3BucketName;

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.awsAccessKeyId,
        secretAccessKey: this.configService.awsSecretAccessKey,
      },
    });
  }

  /**
   * Uploads a file to S3 with an automatically generated key.
   * @param file The file to upload.
   * @returns The generated file key.
   */
  async uploadFileWithGeneratedKey(file: Express.Multer.File): Promise<string> {
    const fileKey = `${uuidv4()}-${file.originalname}`;
    await this.uploadFileWithKey(file, fileKey);
    return fileKey;
  }

  /**
   * Uploads a file to S3 with a specific key.
   * @param file The file to upload.
   * @param fileKey The specific key to use for the S3 object.
   */
  async uploadFileWithKey(
    file: Express.Multer.File,
    fileKey: string,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);
  }

  async getSignedUrl(
    fileKey: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(fileKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
    });

    await this.s3Client.send(command);
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.controller.ts

- Extension: .ts
- Language: typescript
- Size: 3421 bytes
- Created: 2025-04-10 01:00:21
- Modified: 2025-04-10 01:00:33

### Code

```typescript
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { WebSocketService } from './websocket.service';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class MessageDataDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Your ride is confirmed',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Message type',
    example: 'info',
  })
  @IsString()
  type: string;
}

class SendMessageDto {
  @ApiProperty({
    description: 'Message event name',
    example: 'notification',
  })
  @IsString()
  @IsNotEmpty()
  event: string;

  @ApiProperty({
    description: 'Message data to send',
    type: MessageDataDto,
  })
  @IsObject()
  @Type(() => MessageDataDto)
  data: MessageDataDto;
}

@ApiTags('websocket')
@Controller('websocket')
export class WebSocketController {
  constructor(private readonly webSocketService: WebSocketService) {}

  @Post('send/user/:userId')
  async sendMessageToUser(
    @Param('userId') userId: string,
    @Body() messageDto: SendMessageDto,
  ) {
    await this.webSocketService.sendToUser(
      userId,
      messageDto.event,
      messageDto.data,
    );
    return { success: true, message: `Message sent to user ${userId}` };
  }

  @Get('location/user/:userId')
  async getUserLocation(@Param('userId') userId: string) {
    const location = await this.webSocketService.getUserLocation(userId);
    if (!location) {
      throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
    }
    return location;
  }

  @Get('location/nearby')
  async getNearbyUsers(
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius: number = 5,
    @Query('userType') userType: string = 'driver',
  ) {
    const users = await this.webSocketService.findNearbyUsers(
      userType,
      latitude,
      longitude,
      radius,
    );
    return {
      total: users.length,
      users,
    };
  }

  @Get('clients')
  async getConnectedClients() {
    const server = this.webSocketService.getServer();

    const sockets = await server.fetchSockets();

    const clients = sockets.map((socket) => ({
      id: socket.id,
      userType: socket.data.userType,
      userId: socket.data.userId,
      connectedAt: socket.handshake.issued,
      rooms: Array.from(socket.rooms),
    }));

    return {
      total: clients.length,
      clients,
    };
  }

  @Get('clients/customers')
  async getConnectedCustomers() {
    const server = this.webSocketService.getServer();
    const sockets = await server.in('type:customer').fetchSockets();

    const clients = sockets.map((socket) => ({
      id: socket.id,
      userId: socket.data.userId,
      connectedAt: socket.handshake.issued,
    }));

    return {
      total: clients.length,
      clients,
    };
  }

  @Get('clients/drivers')
  async getConnectedDrivers() {
    const server = this.webSocketService.getServer();
    const sockets = await server.in('type:driver').fetchSockets();

    const clients = sockets.map((socket) => ({
      id: socket.id,
      userId: socket.data.userId,
      connectedAt: socket.handshake.issued,
    }));

    return {
      total: clients.length,
      clients,
    };
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.gateway.ts

- Extension: .ts
- Language: typescript
- Size: 4001 bytes
- Created: 2025-04-07 00:37:06
- Modified: 2025-04-14 15:48:23

### Code

```typescript
import {
  WebSocketGateway as NestWebSocketGateway,
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';
import { JwtService } from 'src/jwt/jwt.service';
import { LocationDto } from './dto/location.dto';

const PING_INTERVAL = 25000;
const PING_TIMEOUT = 10000;

@NestWebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
  pingInterval: PING_INTERVAL,
  pingTimeout: PING_TIMEOUT,
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(WebSocketGateway.name);

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly jwtService: JwtService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    this.logger.log('Socket.IO Server initialized with Redis Adapter');
    this.webSocketService.setServer(server);
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const clientId = client.id;

    const token =
      client.handshake.auth.token ||
      client.handshake.query.token ||
      client.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      client.emit('error', {
        message: 'Authentication required',
      });
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.validateToken(token);

      if (!payload || !payload.userId) {
        client.emit('error', { message: 'Invalid token' });
        client.disconnect(true);
        return;
      }

      const userType = payload.userType;
      if (userType !== 'driver' && userType !== 'customer') {
        client.emit('error', { message: 'Invalid user type' });
        client.disconnect(true);
        return;
      }

      // Store user data in the socket
      client.data.userId = payload.userId;
      client.data.userType = userType;

      // Join rooms based on user type and ID for easier targeting
      client.join(`user:${payload.userId}`);
      client.join(`type:${userType}`);

      client.emit('connection', {
        status: 'connected',
        clientId: clientId,
        userType: userType,
        message: 'Connection successful',
      });

      this.logger.log(
        `Client ${clientId} authenticated as ${userType} with userId: ${payload.userId}`,
      );
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.emit('error', {
        message: 'Authentication failed',
      });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any) {
    this.logger.debug(
      `Message received [${client.id}]: ${JSON.stringify(payload)}`,
    );
    return { event: 'message', data: payload };
  }

  @SubscribeMessage('updateLocation')
  handleLocationUpdate(client: Socket, payload: LocationDto) {
    // Client zaten bağlı ve doğrulanmış olmalı
    const userId = client.data.userId;
    const userType = client.data.userType;

    if (!userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    this.logger.debug(
      `Location update from ${userType} ${userId}: ${JSON.stringify(payload)}`,
    );

    // Store location to redis
    this.storeUserLocation(userId, userType, payload);

    return { success: true };
  }

  private async storeUserLocation(
    userId: string,
    userType: string,
    location: LocationDto,
  ) {
    try {
      // Use Redis service to store location
      await this.webSocketService
        .getRedisService()
        .storeUserLocation(userId, userType, location);
    } catch (error) {
      this.logger.error(
        `Error storing location for user ${userId}: ${error.message}`,
      );
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.module.ts

- Extension: .ts
- Language: typescript
- Size: 520 bytes
- Created: 2025-04-07 00:35:14
- Modified: 2025-04-10 01:00:31

### Code

```typescript
import { Module } from '@nestjs/common';
import { WebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { WebSocketController } from './websocket.controller';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [JwtModule, RedisModule],
  controllers: [WebSocketController],
  providers: [WebSocketGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\websocket.service.ts

- Extension: .ts
- Language: typescript
- Size: 1718 bytes
- Created: 2025-04-07 00:39:08
- Modified: 2025-04-09 15:48:03

### Code

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  constructor(private readonly redisService: RedisService) {}

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server {
    return this.server;
  }

  getRedisService(): RedisService {
    return this.redisService;
  }

  async sendToUser(userId: string, event: string, data: any) {
    this.logger.debug(`Sending to user ${userId}`);
    this.server.to(`user:${userId}`).emit(event, data);
  }

  broadcast(event: string, data: any, exceptSocketId?: string) {
    this.logger.debug(`Broadcasting: ${event}`);
    if (exceptSocketId) {
      this.server.except(exceptSocketId).emit(event, data);
    } else {
      this.server.emit(event, data);
    }
  }

  async sendToUserType(userType: string, event: string, data: any) {
    this.logger.debug(`Sending to ${userType}s`);
    this.server.to(`type:${userType}`).emit(event, data);
  }

  async sendToDrivers(event: string, data: any) {
    return this.sendToUserType('driver', event, data);
  }

  async sendToCustomers(event: string, data: any) {
    return this.sendToUserType('customer', event, data);
  }

  async getUserLocation(userId: string) {
    return this.redisService.getUserLocation(userId);
  }

  async findNearbyUsers(
    userType: string,
    latitude: number,
    longitude: number,
    radius: number = 5,
  ) {
    return this.redisService.findNearbyUsers(
      userType,
      latitude,
      longitude,
      radius,
    );
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\auth.client.ts

- Extension: .ts
- Language: typescript
- Size: 1423 bytes
- Created: 2025-04-03 13:33:36
- Modified: 2025-04-03 14:58:33

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { SigninDto } from './dto/signin.dto';

@Injectable()
export class AuthClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('auth');
  }

  async initiateCustomerSignup(
    createCustomerDto: CreateCustomerDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/initiate-signup',
      createCustomerDto,
    );
    return data;
  }

  async completeCustomerSignup(validateOtpDto: ValidateOtpDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/complete-signup',
      validateOtpDto,
    );
    return data;
  }

  async signinCustomer(signinDto: SigninDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/initiate-sign-in',
      signinDto,
    );
    return data;
  }

  async completeCustomerSignin(validateOtpDto: ValidateOtpDto): Promise<any> {
    const { data } = await this.httpClient.post<any>(
      '/auth/customer/complete-sign-in',
      validateOtpDto,
    );
    return data;
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\gender.enum.ts

- Extension: .ts
- Language: typescript
- Size: 80 bytes
- Created: 2025-04-03 13:34:44
- Modified: 2025-04-03 14:58:33

### Code

```typescript
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\customers.client.ts

- Extension: .ts
- Language: typescript
- Size: 2800 bytes
- Created: 2025-04-03 14:28:57
- Modified: 2025-04-14 15:31:49

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { InitiateEmailUpdateDto } from './dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from './dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from './dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from './dto/complete-phone-update.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class CustomersClient {
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findAll(): Promise<any> {
    const { data } = await this.httpClient.get('/customers');
    return data;
  }

  async findOne(id: string): Promise<any> {
    const { data } = await this.httpClient.get(`/customers/${id}`);
    return data;
  }

  async updateProfile(
    id: string,
    profileData: UpdateCustomerDto,
  ): Promise<any> {
    const { data } = await this.httpClient.patch(
      `/customers/${id}/profile`,
      profileData,
    );
    return data;
  }

  async remove(id: string): Promise<any> {
    const { data } = await this.httpClient.delete(`/customers/${id}`);
    return data;
  }

  async initiateEmailUpdate(
    userId: string,
    dto: InitiateEmailUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/initiate-email-update`,
      dto,
    );
    return data;
  }

  async completeEmailUpdate(
    userId: string,
    dto: CompleteEmailUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/complete-email-update`,
      dto,
    );
    return data;
  }

  async initiatePhoneUpdate(
    userId: string,
    dto: InitiatePhoneUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/initiate-phone-update`,
      dto,
    );
    return data;
  }

  async completePhoneUpdate(
    userId: string,
    dto: CompletePhoneUpdateDto,
  ): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/complete-phone-update`,
      dto,
    );
    return data;
  }

  async addAddress(userId: string, addressDto: CreateAddressDto): Promise<any> {
    const { data } = await this.httpClient.post(
      `/customers/${userId}/addresses`,
      addressDto,
    );
    return data;
  }

  async deleteAddress(userId: string, addressId: string): Promise<any> {
    const { data } = await this.httpClient.delete(
      `/customers/${userId}/addresses/${addressId}`,
    );
    return data;
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\driver\drivers.client.ts

- Extension: .ts
- Language: typescript
- Size: 1247 bytes
- Created: 2025-04-16 00:39:36
- Modified: 2025-04-16 00:51:06

### Code

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';

@Injectable()
export class DriversClient {
  private readonly logger = new Logger(DriversClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('driver');
  }

  async findOne(id: string): Promise<any> {
    const { data } = await this.httpClient.get(`/drivers/${id}`);
    return data;
  }

  // Example: Update driver profile (adapt endpoint and DTO)
  // async updateProfile(id: string, profileData: UpdateDriverDto): Promise<any> {
  //   this.logger.log(`Updating profile for driver ${id} via driver service`);
  //   const { data } = await this.httpClient.patch(`/drivers/${id}/profile`, profileData);
  //   return data;
  // }

  // Example: Remove driver (adapt endpoint)
  // async remove(id: string): Promise<any> {
  //   this.logger.log(`Removing driver ${id} via driver service`);
  //   const { data } = await this.httpClient.delete(`/drivers/${id}`);
  //   return data;
  // }

  // Add other methods to interact with the driver microservice as needed
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\users\users.client.ts

- Extension: .ts
- Language: typescript
- Size: 1984 bytes
- Created: 2025-03-25 00:17:38
- Modified: 2025-04-15 19:49:07

### Code

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { CreateUserDto, UpdateUserDto, User } from './users.interfaces';
import { NotifyFileUploadedDto } from './dto/notify-file-uploaded.dto';

@Injectable()
export class UsersClient {
  private readonly logger = new Logger(UsersClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('users');
  }

  async findAll(): Promise<User[]> {
    const { data } = await this.httpClient.get<User[]>('/users');
    return data;
  }

  async findOne(id: string): Promise<User> {
    const { data } = await this.httpClient.get<User>(`/customers/${id}`);
    return data;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { data } = await this.httpClient.post<User>('/users', createUserDto);
    return data;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const { data } = await this.httpClient.patch<User>(
      `/users/${id}`,
      updateUserDto,
    );
    return data;
  }

  async remove(id: string): Promise<void> {
    await this.httpClient.delete(`/users/${id}`);
  }

  async notifyFileUploaded(
    notificationDto: NotifyFileUploadedDto,
  ): Promise<void> {
    try {
      const endpoint = '/users/notify-file-upload';
      this.logger.log(
        `Sending file upload notification to User API: ${endpoint} for user ${notificationDto.userId}`,
      );
      await this.httpClient.post(endpoint, notificationDto);
      this.logger.log(
        `Successfully notified User API for user ${notificationDto.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to notify User API about file upload for user ${notificationDto.userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\users\users.interfaces.ts

- Extension: .ts
- Language: typescript
- Size: 342 bytes
- Created: 2025-03-25 00:20:03
- Modified: 2025-03-25 00:27:16

### Code

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\create-customer.dto.ts

- Extension: .ts
- Language: typescript
- Size: 1747 bytes
- Created: 2025-04-03 13:33:59
- Modified: 2025-04-15 19:26:37

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVehicleDto } from './create-vehicle.dto';
import { Gender } from '../gender.enum';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'John',
    description: 'First name of the customer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Last name of the customer',
  })
  @IsString()
  @IsNotEmpty()
  surname: string;

  @ApiProperty({
    example: '+905551234567',
    description: 'Phone number in international format',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address of the customer',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    type: CreateVehicleDto,
    description: 'Vehicle information',
  })
  @ValidateNested()
  @Type(() => CreateVehicleDto)
  vehicle: CreateVehicleDto;

  @ApiProperty({
    example: '12345678901',
    description: 'National identity number (11 digits)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Identity number must be 11 digits' })
  identityNumber?: string;

  @ApiProperty({
    example: '1993-06-17',
    description: 'Date of birth in ISO format',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: Gender.MALE,
    description: 'Gender',
    enum: Gender,
    enumName: 'Gender',
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\create-vehicle.dto.ts

- Extension: .ts
- Language: typescript
- Size: 468 bytes
- Created: 2025-04-03 13:34:12
- Modified: 2025-04-15 19:26:42

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({
    example: 'manual',
    description: 'Type of transmission',
    enum: ['manual', 'automatic'],
  })
  @IsString()
  @IsNotEmpty()
  transmissionType: string;

  @ApiProperty({
    example: '34ABC123',
    description: 'License plate of the vehicle',
  })
  @IsString()
  @IsNotEmpty()
  licensePlate: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\signin.dto.ts

- Extension: .ts
- Language: typescript
- Size: 279 bytes
- Created: 2025-04-03 13:34:31
- Modified: 2025-04-15 19:27:20

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SigninDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'The phone number of the user',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\auth\dto\validate-otp.dto.ts

- Extension: .ts
- Language: typescript
- Size: 427 bytes
- Created: 2025-04-03 13:34:21
- Modified: 2025-04-15 19:26:51

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateOtpDto {
  @ApiProperty({
    description: 'Phone number of the user',
    example: '+905551234567',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: 'OTP sent to the user for validation',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\complete-email-update.dto.ts

- Extension: .ts
- Language: typescript
- Size: 475 bytes
- Created: 2025-04-03 14:29:42
- Modified: 2025-04-15 19:27:01

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CompleteEmailUpdateDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address to update to',
  })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP sent to the new email for validation',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\complete-phone-update.dto.ts

- Extension: .ts
- Language: typescript
- Size: 608 bytes
- Created: 2025-04-03 14:29:59
- Modified: 2025-04-15 19:49:07

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CompletePhoneUpdateDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'New phone number in international format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{10,14}$/, {
    message:
      'Phone number must be in international format (e.g., +905551234567)',
  })
  newPhone: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP sent to the new phone for validation',
  })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\create-address.dto.ts

- Extension: .ts
- Language: typescript
- Size: 3276 bytes
- Created: 2025-04-14 15:31:10
- Modified: 2025-04-15 19:27:13

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class GeoLocation {
  @ApiProperty({
    example: 'Point',
    description: 'GeoJSON type',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example: [-122.408, 37.788],
    description: 'Coordinates [longitude, latitude]',
  })
  @IsNotEmpty()
  coordinates: [number, number];
}

export class CreateAddressDto {
  @ApiProperty({
    example: 'Home',
    description: 'Address label (e.g., Home, Work)',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example: '2-16 Ellis St, San Francisco, CA 94108, USA',
    description: 'Fully formatted address text',
  })
  @IsString()
  @IsNotEmpty()
  formatted_address: string;

  // Google Maps API fields
  @ApiProperty({
    example: '2–16',
    description: 'Building number',
    required: false,
  })
  @IsString()
  @IsOptional()
  street_number?: string;

  @ApiProperty({
    example: 'Ellis St',
    description: 'Street name',
    required: false,
  })
  @IsString()
  @IsOptional()
  route?: string;

  @ApiProperty({
    example: 'Union Square',
    description: 'Neighborhood',
    required: false,
  })
  @IsString()
  @IsOptional()
  neighborhood?: string;

  @ApiProperty({
    example: 'San Francisco',
    description: 'City',
    required: false,
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiProperty({
    example: 'San Francisco County',
    description: 'County',
    required: false,
  })
  @IsString()
  @IsOptional()
  administrative_area_level_2?: string;

  @ApiProperty({
    example: 'CA',
    description: 'State/Province',
    required: false,
  })
  @IsString()
  @IsOptional()
  administrative_area_level_1?: string;

  @ApiProperty({
    example: '94108',
    description: 'Postal code',
    required: false,
  })
  @IsString()
  @IsOptional()
  postal_code?: string;

  @ApiProperty({
    example: 'United States',
    description: 'Country name',
    required: false,
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({
    example: 'US',
    description: 'ISO Country Code',
    required: false,
  })
  @IsString()
  @IsOptional()
  country_code?: string;

  @ApiProperty({
    example: 'America/Los_Angeles',
    description: 'Timezone',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({
    example: 'ChIJIQBpAG2ahYAR_6128GcTUEo',
    description: 'Google Maps unique place ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  place_id?: string;

  @ApiProperty({
    example: {
      type: 'Point',
      coordinates: [-122.408, 37.788],
    },
    description: 'GeoJSON location object',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GeoLocation)
  location: GeoLocation;

  @ApiProperty({
    example: 'Ring the doorbell',
    description: 'Additional delivery instructions',
    required: false,
  })
  @IsString()
  @IsOptional()
  additional_info?: string;

  @ApiProperty({
    example: false,
    description: 'Is this the default address?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\initiate-email-update.dto.ts

- Extension: .ts
- Language: typescript
- Size: 313 bytes
- Created: 2025-04-03 14:29:33
- Modified: 2025-04-15 19:49:07

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsMongoId, IsNotEmpty } from 'class-validator';

export class InitiateEmailUpdateDto {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'New email address to update to',
  })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\initiate-phone-update.dto.ts

- Extension: .ts
- Language: typescript
- Size: 456 bytes
- Created: 2025-04-03 14:29:50
- Modified: 2025-04-15 19:49:07

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';

export class InitiatePhoneUpdateDto {
  @ApiProperty({
    example: '+905551234567',
    description: 'New phone number in international format',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{10,14}$/, {
    message:
      'Phone number must be in international format (e.g., +905551234567)',
  })
  newPhone: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\customer\dto\update-customer.dto.ts

- Extension: .ts
- Language: typescript
- Size: 1114 bytes
- Created: 2025-04-03 14:29:19
- Modified: 2025-04-15 19:49:07

### Code

```typescript
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  IsDateString,
  IsEnum,
  IsEmail,
} from 'class-validator';
import { Gender } from '../../auth/gender.enum';

export class UpdateCustomerDto {
  @ApiHideProperty()
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiHideProperty()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    example: '12345678901',
    description: 'National identity number (11 digits)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Identity number must be 11 digits' })
  identityNumber?: string;

  @ApiProperty({
    example: '1993-06-17',
    description: 'Date of birth in ISO format',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    example: Gender.MALE,
    description: 'Gender',
    enum: Gender,
    enumName: 'Gender',
    required: false,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\clients\users\dto\notify-file-uploaded.dto.ts

- Extension: .ts
- Language: typescript
- Size: 176 bytes
- Created: 2025-04-15 19:42:13
- Modified: 2025-04-15 19:49:07

### Code

```typescript
import { S3FileType } from 'src/s3/s3-file-type.enum';

export class NotifyFileUploadedDto {
  userId: string;
  fileType: S3FileType;
  fileKey: string;
  fileUrl?: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\auth\auth.controller.ts

- Extension: .ts
- Language: typescript
- Size: 3495 bytes
- Created: 2025-04-15 18:34:05
- Modified: 2025-04-15 19:49:09

### Code

```typescript
import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('initiate-signup')
  @ApiOperation({ summary: 'Initiate customer registration process' })
  @ApiResponse({ status: 201, description: 'Signup initiated, OTP sent' })
  @ApiResponse({ status: 409, description: 'Customer already exists' })
  async initiateSignup(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      return await this.authService.initiateCustomerSignup(createCustomerDto);
    } catch (error) {
      this.logger.error(
        `User signup initiation error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signup initiation',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-signup')
  @ApiOperation({ summary: 'Complete customer registration with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Registration completed, token returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async completeSignup(@Body() validateOtpDto: ValidateOtpDto) {
    try {
      return await this.authService.completeCustomerSignup(validateOtpDto);
    } catch (error) {
      this.logger.error(
        `User signup completion error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signup completion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-signin')
  @ApiOperation({ summary: 'Sign in a customer' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async signin(@Body() signinDto: SigninDto) {
    try {
      return await this.authService.signinCustomer(signinDto);
    } catch (error) {
      this.logger.error(`User signin error: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred during signin',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-signin')
  @ApiOperation({ summary: 'Complete sign in a customer' })
  @ApiResponse({ status: 200, description: 'Token generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async completeSignin(@Body() validateOtpDto: ValidateOtpDto) {
    try {
      return await this.authService.completeCustomerSignin(validateOtpDto);
    } catch (error) {
      this.logger.error(
        `User complete signin error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signin completion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\auth\auth.module.ts

- Extension: .ts
- Language: typescript
- Size: 331 bytes
- Created: 2025-04-15 17:13:10
- Modified: 2025-04-15 19:49:09

### Code

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [ClientsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\auth\auth.service.ts

- Extension: .ts
- Language: typescript
- Size: 951 bytes
- Created: 2025-04-15 17:13:10
- Modified: 2025-04-15 19:49:09

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { AuthClient } from '../../clients/auth/auth.client';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';

@Injectable()
export class AuthService {
  constructor(private readonly authClient: AuthClient) {}

  async initiateCustomerSignup(createCustomerDto: CreateCustomerDto) {
    return this.authClient.initiateCustomerSignup(createCustomerDto);
  }

  async completeCustomerSignup(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeCustomerSignup(validateOtpDto);
  }

  async signinCustomer(signinDto: SigninDto) {
    return this.authClient.signinCustomer(signinDto);
  }

  async completeCustomerSignin(validateOtpDto: ValidateOtpDto) {
    return this.authClient.completeCustomerSignin(validateOtpDto);
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\content.controller.ts

- Extension: .ts
- Language: typescript
- Size: 1004 bytes
- Created: 2025-04-14 15:39:19
- Modified: 2025-04-14 15:48:22

### Code

```typescript
import {
  Controller,
  Get,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { FaqItemDto } from './dto/faq.dto';

@ApiTags('content')
@Controller('content')
export class ContentController {
  private readonly logger = new Logger(ContentController.name);

  constructor(private readonly contentService: ContentService) {}

  @Get('faqs')
  @ApiOperation({ summary: 'Get all frequently asked questions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all FAQ items',
    type: [FaqItemDto],
  })
  getFaqs(): FaqItemDto[] {
    try {
      return this.contentService.getFaqs();
    } catch (error) {
      this.logger.error(`Error fetching FAQs: ${error.message}`, error.stack);
      throw new HttpException(
        'An error occurred while fetching FAQs',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\content.module.ts

- Extension: .ts
- Language: typescript
- Size: 335 bytes
- Created: 2025-04-14 15:38:45
- Modified: 2025-04-14 15:48:22

### Code

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [JwtModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\content.service.ts

- Extension: .ts
- Language: typescript
- Size: 1829 bytes
- Created: 2025-04-14 15:39:03
- Modified: 2025-04-14 15:48:22

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { FaqItemDto } from './dto/faq.dto';

@Injectable()
export class ContentService {
  private readonly faqs: FaqItemDto[] = [
    {
      question: 'How do I create an account?',
      answer:
        'You can create an account by clicking on the "Sign Up" button on the homepage and following the registration process. You will need to provide your email, phone number, and create a password.',
    },
    {
      question: 'How can I reset my password?',
      answer:
        'To reset your password, click on the "Forgot Password" link on the login page. You will receive a one-time password (OTP) on your registered email or phone number. Enter the OTP and create a new password.',
    },
    {
      question: 'How do I update my contact information?',
      answer:
        'You can update your contact information by going to your profile settings. For email updates, use the "Initiate Email Update" option. For phone updates, use the "Initiate Phone Update" option. Both processes require OTP verification for security.',
    },
    {
      question: 'How do I add a new address to my profile?',
      answer:
        'To add a new address, go to your profile and select "Addresses". Click on "Add New Address" and fill in the required information such as street address, city, postal code, and country. Save the changes to add the address to your profile.',
    },
    {
      question: 'What should I do if I encounter a technical issue?',
      answer:
        'If you encounter any technical issues, please contact our support team through the "Help & Support" section in the app or website. Alternatively, you can email us at support@example.com with details of the issue you are experiencing.',
    },
  ];

  getFaqs(): FaqItemDto[] {
    return this.faqs;
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\customers\customers.controller.ts

- Extension: .ts
- Language: typescript
- Size: 8876 bytes
- Created: 2025-04-03 14:31:24
- Modified: 2025-04-16 00:48:00

### Code

```typescript
import {
  Controller,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  HttpException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { CustomersService } from './customers.service';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { CreateAddressDto } from 'src/clients/customer/dto/create-address.dto';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@ApiTags('customer')
@ApiBearerAuth()
@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting profile for customer ID: ${user.userId}`);
      return await this.customersService.findOne(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching the profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async updateProfile(
    @Body() profileData: UpdateCustomerDto,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      return await this.customersService.updateProfile(
        user.userId,
        profileData,
      );
    } catch (error) {
      this.logger.error(
        `Error updating profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while updating profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deleted successfully' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async remove(@GetUser() user: IJwtPayload) {
    try {
      return await this.customersService.remove(user.userId);
    } catch (error) {
      this.logger.error(
        `Error deleting customer: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting customer',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-email-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate email update process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent to new email' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already in use or same as current',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  async initiateEmailUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: InitiateEmailUpdateDto,
  ) {
    try {
      return await this.customersService.initiateEmailUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error initiating email update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while initiating email update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-email-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete email update with OTP verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OTP or user ID',
  })
  async completeEmailUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: CompleteEmailUpdateDto,
  ) {
    try {
      return await this.customersService.completeEmailUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error completing email update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while completing email update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-phone-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate phone update process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent to new phone' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone already in use or same as current',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  async initiatePhoneUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: InitiatePhoneUpdateDto,
  ) {
    try {
      return await this.customersService.initiatePhoneUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error initiating phone update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while initiating phone update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-phone-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete phone update with OTP verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phone updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OTP or user ID',
  })
  async completePhoneUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: CompletePhoneUpdateDto,
  ) {
    try {
      return await this.customersService.completePhoneUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error completing phone update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while completing phone update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address for customer' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Address added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user ID',
  })
  async addAddress(
    @GetUser() user: IJwtPayload,
    @Body() addressDto: CreateAddressDto,
  ) {
    try {
      this.logger.log(`Adding address for user ID: ${user.userId}`);
      return await this.customersService.addAddress(user.userId, addressDto);
    } catch (error) {
      this.logger.error(`Error adding address: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while adding address',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  async deleteAddress(@GetUser() user, @Param('addressId') addressId: string) {
    try {
      this.logger.log(
        `Deleting address ${addressId} for user ID: ${user.userId}`,
      );
      return await this.customersService.deleteAddress(user.userId, addressId);
    } catch (error) {
      this.logger.error(
        `Error deleting address: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting address',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\customers\customers.module.ts

- Extension: .ts
- Language: typescript
- Size: 426 bytes
- Created: 2025-04-03 14:31:47
- Modified: 2025-04-03 14:58:34

### Code

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { JwtModule } from 'src/jwt/jwt.modulte';

@Module({
  imports: [ClientsModule, JwtModule],
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\customers\customers.service.ts

- Extension: .ts
- Language: typescript
- Size: 1982 bytes
- Created: 2025-04-03 14:31:37
- Modified: 2025-04-14 15:32:02

### Code

```typescript
import { Injectable } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { CreateAddressDto } from 'src/clients/customer/dto/create-address.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly customersClient: CustomersClient) {}

  async findAll() {
    return this.customersClient.findAll();
  }

  async findOne(id: string) {
    return this.customersClient.findOne(id);
  }

  async updateProfile(id: string, profileData: UpdateCustomerDto) {
    return this.customersClient.updateProfile(id, profileData);
  }

  async remove(id: string) {
    return this.customersClient.remove(id);
  }

  async initiateEmailUpdate(userId: string, dto: InitiateEmailUpdateDto) {
    return this.customersClient.initiateEmailUpdate(userId, dto);
  }

  async completeEmailUpdate(userId: string, dto: CompleteEmailUpdateDto) {
    return this.customersClient.completeEmailUpdate(userId, dto);
  }

  async initiatePhoneUpdate(userId: string, dto: InitiatePhoneUpdateDto) {
    return this.customersClient.initiatePhoneUpdate(userId, dto);
  }

  async completePhoneUpdate(userId: string, dto: CompletePhoneUpdateDto) {
    return this.customersClient.completePhoneUpdate(userId, dto);
  }

  async addAddress(userId: string, addressDto: CreateAddressDto) {
    return this.customersClient.addAddress(userId, addressDto);
  }

  async deleteAddress(userId: string, addressId: string) {
    return this.customersClient.deleteAddress(userId, addressId);
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\drivers\drivers.controller.ts

- Extension: .ts
- Language: typescript
- Size: 3687 bytes
- Created: 2025-04-16 00:38:25
- Modified: 2025-04-16 00:50:29

### Code

```typescript
import {
  Controller,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  HttpException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { DriversService } from './drivers.service';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current driver profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver profile retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async getProfile(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting profile for driver ID: ${user.userId}`);
      return await this.driversService.findOne(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching driver profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while fetching the driver profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async updateMyProfile(
    @Body() profileData: any,
    @GetUser() user: IJwtPayload,
  ) {
    // Replace 'any' with UpdateDriverDto if available
    try {
      this.logger.log(`Updating profile for driver ID: ${user.userId}`);
      // Replace with actual update method if available
      // return await this.driversService.updateProfile(user.userId, profileData);
      return { message: `Update driver ${user.userId} - Placeholder` }; // Placeholder
    } catch (error) {
      this.logger.error(
        `Error updating driver profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while updating driver profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Example: Delete driver profile
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current driver profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async removeMyProfile(@GetUser() user) {
    try {
      this.logger.log(`Deleting driver ID: ${user.userId}`);
      // Replace with actual remove method if available
      // return await this.driversService.remove(user.userId);
      return { message: `Delete driver ${user.userId} - Placeholder` }; // Placeholder
    } catch (error) {
      this.logger.error(`Error deleting driver: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting driver',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Add other driver-specific endpoints here as needed
  // e.g., managing vehicles, availability, routes, etc.
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\drivers\drivers.module.ts

- Extension: .ts
- Language: typescript
- Size: 412 bytes
- Created: 2025-04-16 00:38:04
- Modified: 2025-04-16 00:46:26

### Code

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule } from '../../clients/clients.module';
import { JwtModule } from 'src/jwt/jwt.modulte';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

@Module({
  imports: [ClientsModule, JwtModule],
  controllers: [DriversController],
  providers: [DriversService],
})
export class DriversModule {}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\drivers\drivers.service.ts

- Extension: .ts
- Language: typescript
- Size: 371 bytes
- Created: 2025-04-16 00:38:14
- Modified: 2025-04-16 00:50:51

### Code

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { DriversClient } from 'src/clients/driver/drivers.client';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(private readonly driversClient: DriversClient) {}

  async findOne(id: string) {
    return this.driversClient.findOne(id);
  }
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\modules\content\dto\faq.dto.ts

- Extension: .ts
- Language: typescript
- Size: 394 bytes
- Created: 2025-04-14 15:38:53
- Modified: 2025-04-14 15:48:22

### Code

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class FaqItemDto {
  @ApiProperty({
    description: 'The question',
    example: 'How do I reset my password?',
  })
  question: string;

  @ApiProperty({
    description: 'The answer to the question',
    example:
      'You can reset your password by clicking on the "Forgot Password" link on the login page.',
  })
  answer: string;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\s3\dto\upload-file.dto.ts

- Extension: .ts
- Language: typescript
- Size: 199 bytes
- Created: 2025-04-15 19:35:51
- Modified: 2025-04-15 19:49:09

### Code

```typescript
import { IsEnum, IsNotEmpty } from 'class-validator';
import { S3FileType } from '../s3-file-type.enum';

export class UploadFileDto {
  @IsEnum(S3FileType)
  @IsNotEmpty()
  fileType: S3FileType;
}

```

## File: C:\Users\eneso\Desktop\sober\customer-api-gateway\src\websocket\dto\location.dto.ts

- Extension: .ts
- Language: typescript
- Size: 423 bytes
- Created: 2025-04-09 15:02:53
- Modified: 2025-04-15 19:27:49

### Code

```typescript
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class LocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  heading?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  @IsOptional()
  @IsNumber()
  altitude?: number;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

```

