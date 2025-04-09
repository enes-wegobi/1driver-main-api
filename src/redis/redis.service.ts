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

  // Client tracking methods
  async addClient(clientId: string, metadata: any = {}) {
    const key = `socket:client:${clientId}`;
    await this.client.hSet(key, {
      ...metadata,
      lastActivity: Date.now().toString(),
      connected: 'true',
    });
    await this.client.expire(key, 3600); // TTL: 1 hour
  }

  async removeClient(clientId: string) {
    await this.client.del(`socket:client:${clientId}`);
  }

  async updateClientActivity(clientId: string) {
    const key = `socket:client:${clientId}`;
    await this.client.hSet(key, 'lastActivity', Date.now().toString());
    await this.client.expire(key, 3600); // Refresh TTL
  }

  async getSocketClient(clientId: string) {
    return this.client.hGetAll(`socket:client:${clientId}`);
  }

  async getAllClients() {
    const keys = await this.client.keys('socket:client:*');
    const clients = {};

    for (const key of keys) {
      const clientId = key.split(':')[2];
      clients[clientId] = await this.client.hGetAll(key);
    }

    return clients;
  }

  // User-to-socket mapping
  async associateUserWithSocket(userId: string, clientId: string) {
    await this.client.sAdd(`socket:user:${userId}`, clientId);
    await this.client.hSet(`socket:client:${clientId}`, 'userId', userId);
  }

  async getUserSockets(userId: string) {
    return this.client.sMembers(`socket:user:${userId}`);
  }

  async removeUserSocket(userId: string, clientId: string) {
    await this.client.sRem(`socket:user:${userId}`, clientId);
  }
}
