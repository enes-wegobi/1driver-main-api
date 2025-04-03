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
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Eklenen import

async function bootstrap() {
  const fastifyAdapter = new FastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
    { logger: ['error', 'warn', 'log', 'debug'] },
  );

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger yapılandırması
  const config = new DocumentBuilder()
    .setTitle('Customer API Gateway')
    .setDescription('The Customer API Gateway description')
    .setVersion('1.0')
    .addTag('users')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.register(fastifyCors, {
    origin: configService.get<string>('CORS_ORIGINS', '*').split(','),
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
        scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
      },
    },
  });

  await app.register(fastifyCompress, {
    encodings: ['gzip', 'deflate'],
  });

  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');

  await app.listen(port, host);
  console.log(`API Gateway started: ${await app.getUrl()}`);
  console.log(`Swagger documentation: ${await app.getUrl()}/api/docs`);
}

bootstrap();
