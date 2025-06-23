import { Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { JwtService } from './jwt.service';
import { ConfigService } from 'src/config/config.service';
import { ConfigModule } from 'src/config/config.module';
import { JwtAuthGuard } from './jwt.guard';
import { LogoutGuard } from './logout.guard';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpiresIn },
      }),
    }),
    RedisModule,
  ],
  providers: [JwtService, JwtAuthGuard, LogoutGuard],
  exports: [JwtService, JwtAuthGuard, LogoutGuard],
})
export class JwtModule {}
