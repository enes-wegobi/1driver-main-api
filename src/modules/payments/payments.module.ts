import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeService } from './services/stripe.service';
import { PaymentsService } from './services/payments.service';
import { PaymentMethodService } from './services/payment-method.service';
import { WebhookHandlerService } from './services/webhook-handler.service';
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
import { TripModule } from '../trip/trip.module';

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
    forwardRef(() => TripModule),
  ],
  providers: [
    StripeService,
    PaymentsService,
    PaymentRepository,
    PaymentMethodService,
    PaymentMethodRepository,
    WebhookHandlerService,
  ],
  controllers: [PaymentsController, WebhookController, PaymentMethodController],
  exports: [
    StripeService,
    PaymentsService,
    PaymentRepository,
    PaymentMethodService,
    PaymentMethodRepository,
    WebhookHandlerService,
  ],
})
export class PaymentsModule {}
