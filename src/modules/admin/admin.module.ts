import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { JwtModule } from '../../jwt/jwt.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
    ]),
    JwtModule,
  ],
  controllers: [AdminAuthController],
  providers: [AdminUserRepository, AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminModule {}