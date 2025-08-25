import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private configService: NestConfigService) {}

  get port(): number {
    return this.configService.get<number>('port', 3000);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('environment', 'development');
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
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

  get jwtExpiresIn(): number {
    return this.configService.get<number>('jwt.expiresIn', 2592000);
  }

  get driverLocationExpiry(): number {
    return this.configService.get<number>('redis.driverLocationExpiry', 900);
  }

  get activeDriverExpiry(): number {
    return this.configService.get<number>('redis.activeDriverExpiry', 1800);
  }

  get activeCustomerExpiry(): number {
    return this.configService.get<number>('redis.activeCustomerExpiry', 1800);
  }

  get valkeyHost(): string {
    return this.configService.get<string>('valkey.host', 'localhost');
  }

  get valkeyPort(): number {
    return this.configService.get<number>('valkey.port', 6379);
  }

  get valkeyUsername(): string {
    return this.configService.get<string>('valkey.username', '');
  }

  get valkeyPassword(): string {
    return this.configService.get<string>('valkey.password', '');
  }

  get valkeyTls(): boolean {
    return this.configService.get<boolean>('valkey.tls', false);
  }

  get googleMapsApiKey(): string {
    return this.configService.get<string>(
      'googleMapsApiKey',
      'googlemapssecretkey',
    );
  }

  get spacesRegion(): string {
    return this.configService.get<string>('spaces.region')!;
  }

  get spacesEndpoint(): string {
    return this.configService.get<string>('spaces.endpoint')!;
  }

  get spacesCdnEndpoint(): string {
    return this.configService.get<string>('spaces.cdnEndpoint')!;
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

  get stripeSecretKey(): string {
    return this.configService.get<string>('stripe.secretKey')!;
  }

  get stripeApiVersion(): string {
    return this.configService.get<string>(
      'stripe.apiVersion',
      '2025-04-30.basil',
    )!;
  }

  get stripeWebhookSecret(): string {
    return this.configService.get<string>('stripe.webhookSecret')!;
  }

  get tripMongoUser(): string {
    return this.configService.get('trip.mongoUser')!!;
  }

  get tripMongoUri(): string {
    return this.configService.get('trip.mongoUrl')!;
  }

  get tripMongoPassword(): string {
    return this.configService.get('trip.mongoPassword')!;
  }
  get tripCostPerMinute(): number {
    return this.configService.get('tripCostPerMinute', 1);
  }

  get mobileBuildVersion(): string {
    return this.configService.get<string>('mobileConfig.buildVersion', '1.0.0');
  }

  get mobileOtpExpiryMinutes(): number {
    return this.configService.get<number>('mobileConfig.otpExpiryMinutes', 2);
  }

  get mobileTripCancellableTimeMinutes(): number {
    return this.configService.get<number>('mobileConfig.tripCancellableTimeMinutes', 5);
  }

  get mobileConfigCacheTtlSeconds(): number {
    return this.configService.get<number>('mobileConfig.configCacheTtlSeconds', 3600);
  }
}
