import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './controllers/payments.controller';
import { WebhookController } from './controllers/webhook.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentRepository } from './repositories/payment.repository';
import { CustomersModule } from '../customers/customers.module';
import { ConfigModule } from 'src/config/config.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { RedisModule } from 'src/redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    CustomersModule,
    ConfigModule,
    JwtModule,
    RedisModule,
    forwardRef(() => AuthModule)
  ],
  providers: [StripeService, PaymentsService, PaymentRepository],
  controllers: [PaymentsController, WebhookController],
  exports: [StripeService, PaymentsService, PaymentRepository],
})
export class PaymentsModule {}
