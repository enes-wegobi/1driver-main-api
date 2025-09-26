import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';
import { PasswordResetCode, PasswordResetCodeSchema } from './schemas/password-reset-code.schema';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { PasswordResetCodeRepository } from './repositories/password-reset-code.repository';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminManagementService } from './services/admin-management.service';
import { AdminTripService } from './services/admin-trip.service';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminManagementController } from './controllers/admin-management.controller';
import { AdminTripController } from './controllers/admin-trip.controller';
import { JwtModule } from '../../jwt/jwt.module';
import { TripModule } from '../trip/trip.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: PasswordResetCode.name, schema: PasswordResetCodeSchema },
    ]),
    JwtModule,
    TripModule,
    PaymentsModule,
  ],
  controllers: [AdminAuthController, AdminManagementController, AdminTripController],
  providers: [AdminUserRepository, PasswordResetCodeRepository, AdminAuthService, AdminManagementService, AdminTripService],
  exports: [AdminAuthService],
})
export class AdminModule {}