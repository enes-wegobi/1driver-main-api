import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';
import { PasswordResetCode, PasswordResetCodeSchema } from './schemas/password-reset-code.schema';
import { AdminUserRepository } from './repositories/admin-user.repository';
import { PasswordResetCodeRepository } from './repositories/password-reset-code.repository';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminManagementService } from './services/admin-management.service';
import { AdminTripService } from './services/admin-trip.service';
import { AdminCustomerService } from './services/admin-customer.service';
import { AdminDriverService } from './services/admin-driver.service';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminManagementController } from './controllers/admin-management.controller';
import { AdminTripController } from './controllers/admin-trip.controller';
import { AdminCustomerController } from './controllers/admin-customer.controller';
import { AdminDriverController } from './controllers/admin-driver.controller';
import { JwtModule } from '../../jwt/jwt.module';
import { TripModule } from '../trip/trip.module';
import { PaymentsModule } from '../payments/payments.module';
import { CustomersModule } from '../customers/customers.module';
import { DriversModule } from '../drivers/drivers.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { S3Module } from '../../s3/s3.module';
import { AdminCampaignsService } from './services/admin-campaigns.service';
import { AdminCampaignsController } from './controllers/admin-campaigns.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: PasswordResetCode.name, schema: PasswordResetCodeSchema },
    ]),
    JwtModule,
    TripModule,
    PaymentsModule,
    CustomersModule,
    DriversModule,
    CampaignsModule,
    S3Module,
  ],
  controllers: [AdminAuthController, AdminManagementController, AdminTripController, AdminCustomerController, AdminDriverController, AdminCampaignsController],
  providers: [AdminUserRepository, PasswordResetCodeRepository, AdminAuthService, AdminManagementService, AdminTripService, AdminCustomerService, AdminDriverService, AdminCampaignsService],
  exports: [AdminAuthService],
})
export class AdminModule {}