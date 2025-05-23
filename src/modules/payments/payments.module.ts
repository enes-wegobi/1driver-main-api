import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { PaymentMethodService } from './payment-method.service';
import { PaymentsController } from './controllers/payments.controller';
import { WebhookController } from './controllers/webhook.controller';
import { PaymentMethodController } from './controllers/payment-method.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import {
  PaymentMethod,
  PaymentMethodSchema,
} from './schemas/payment-method.schema';
import { PaymentRepository } from './repositories/payment.repository';
import { PaymentMethodRepository } from './repositories/payment-method.repository';
import { CustomersModule } from '../customers/customers.module';
import { ConfigModule } from 'src/config/config.module';
import { JwtModule } from 'src/jwt/jwt.module';
import { RedisModule } from 'src/redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: PaymentMethod.name, schema: PaymentMethodSchema },
    ]),
    CustomersModule,
    ConfigModule,
    JwtModule,
    RedisModule,
    forwardRef(() => AuthModule),
  ],
  providers: [
    StripeService,
    PaymentsService,
    PaymentRepository,
    PaymentMethodService,
    PaymentMethodRepository,
  ],
  controllers: [PaymentsController, WebhookController, PaymentMethodController],
  exports: [
    StripeService,
    PaymentsService,
    PaymentRepository,
    PaymentMethodService,
    PaymentMethodRepository,
  ],
})
export class PaymentsModule {}
