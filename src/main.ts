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
        styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.googleapis.com'],
        fontSrc: [`'self'`, 'https://fonts.gstatic.com'],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
        connectSrc: [`'self'`],
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
