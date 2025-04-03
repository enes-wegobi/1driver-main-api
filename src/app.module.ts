import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validate } from './config/validation';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtMiddleware } from './jwt/jwt.middleware';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    JwtModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .forRoutes('*');
  }
}