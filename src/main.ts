import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

class FastifySocketIORedisAdapter extends IoAdapter {
  private pubClient: Redis;
  private subClient: Redis;
  private readonly app: any;

  constructor(app: any) {
    super(app);
    this.app = app;
  }

  async connectToRedis(redisUrl: string) {
    // Extract connection details from URL
    const configService = this.app.get(ConfigService);

    this.pubClient = new Redis({
      host: configService.get('valkey.host', 'localhost'),
      port: configService.get('valkey.port', 6379),
      username: configService.get('valkey.username', ''),
      password: configService.get('valkey.password', ''),
      tls: configService.get('valkey.tls', false) ? {} : undefined,
    });

    this.subClient = new Redis({
      host: configService.get('valkey.host', 'localhost'),
      port: configService.get('valkey.port', 6379),
      username: configService.get('valkey.username', ''),
      password: configService.get('valkey.password', ''),
      tls: configService.get('valkey.tls', false) ? {} : undefined,
    });

    this.pubClient.on('error', (err) =>
      console.error('Valkey Pub Client Error', err),
    );
    this.subClient.on('error', (err) =>
      console.error('Valkey Sub Client Error', err),
    );

    this.pubClient.on('connect', () => {
      console.log('Valkey Pub Client connected');
    });

    this.subClient.on('connect', () => {
      console.log('Valkey Sub Client connected');
    });

    console.log('Valkey adapter clients initialized');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = this.httpServer;
    const io = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type'],
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

  await fastifyAdapter.register(fastifyMultipart as any, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger: ['error', 'warn', 'log', 'debug'] },
  );

  const configService = app.get(ConfigService);
  const redisUrl = configService.get('redis.url', '0.0.0.0');
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
    origin: '*',
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  await app.register(fastifyHelmet as any, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.googleapis.com'],
        fontSrc: [`'self'`, 'https://fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
        connectSrc: [
          `'self'`,
          'http://localhost:8080',
          'http://127.0.0.1:8080',
          'ws://localhost:8080',
          'ws://127.0.0.1:8080',
          'https://1drive-dev.wegobitest.com',
          'wss://1drive-dev.wegobitest.com',
        ],
      },
    },
  });

  await app.register(fastifyCompress as any, {
    encodings: ['gzip', 'deflate'],
  });

  const port = configService.get('PORT', 3000);
  const host = configService.get('HOST', '0.0.0.0');

  await app.listen(port, host);
  console.log(`API Gateway started: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
  console.log(`WebSocket server is running with Redis adapter`);
}

bootstrap();
