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

  get spacesRegion(): string {
    return this.configService.get<string>('spaces.region')!;
  }

  get spacesEndpoint(): string {
    return this.configService.get<string>('spaces.endpoint')!;
  }

  get spacesAccessKeyId(): string {
    return this.configService.get<string>('spaces.accessKeyId')!;
  }

  get spacesSecretAccessKey(): string {
    return this.configService.get<string>('spaces.secretAccessKey')!;
  }

  get spacesBucketName(): string {
    return this.configService.get<string>('spaces.bucketName')!;
  }

  get firebase() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    const privateKey = this.configService.get<string>('firebase.privateKey');

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }
}
