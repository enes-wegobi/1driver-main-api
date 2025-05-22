import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { ConfigService } from '@nestjs/config';
import { INestApplicationContext } from '@nestjs/common';

export class SocketIORedisAdapter extends IoAdapter {
  private pubClient: Redis;
  private subClient: Redis;
  private readonly app: INestApplicationContext;

  constructor(app: INestApplicationContext) {
    super(app);
    this.app = app;
  }

  async connectToRedis() {
    const configService = this.app.get(ConfigService);

    // Use only Valkey configuration
    const host = configService.get('valkey.host', 'localhost');
    const port = configService.get('valkey.port', 6379);
    const username = configService.get('valkey.username', '');
    const password = configService.get('valkey.password', '');
    const tls = configService.get('valkey.tls', false) ? {} : undefined;

    this.pubClient = new Redis({
      host,
      port,
      username,
      password,
      tls,
    });

    this.subClient = new Redis({
      host,
      port,
      username,
      password,
      tls,
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
