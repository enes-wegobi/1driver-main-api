// Initialize DataDog tracer first (before any other imports)
import './tracer';

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
import { WebSocketModule } from './websocket/websocket.module';
import { LoggerService } from './logger/logger.service';
import rawBody from 'fastify-raw-body';

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();
  const webhookRoutes = ['/api/webhooks/stripe'];

  await fastifyAdapter.register(rawBody as any, {
    field: 'rawBody',
    global: false,
    encoding: false,
    runFirst: true,
    routes: ['/api/webhooks/stripe', '/webhooks/stripe'],
    jsonContentTypes: [],
  });

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
  const socketIOAdapter = WebSocketModule.getSocketIOAdapter(app);
  await socketIOAdapter.connectToRedis();
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
      'stripe-signature',
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

  // Get logger service for startup logs
  const logger = app.get(LoggerService);
  logger.info(`API Gateway started: ${await app.getUrl()}`, {
    port,
    host,
    type: 'startup',
  });
  logger.info(`Swagger documentation: ${await app.getUrl()}/api/docs`, {
    type: 'startup',
  });
  logger.info(`WebSocket server is running with Redis adapter`, {
    type: 'startup',
  });
}

bootstrap();
