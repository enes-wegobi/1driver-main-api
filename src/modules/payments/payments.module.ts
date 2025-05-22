import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './controllers/webhook.controller';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { PaymentRepository } from './repositories/payment.repository';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    CustomersModule,
  ],
  providers: [StripeService, PaymentsService, PaymentRepository],
  controllers: [PaymentsController, WebhookController],
  exports: [StripeService, PaymentsService, PaymentRepository],
})
export class PaymentsModule {}
