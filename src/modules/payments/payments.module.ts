import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [CustomersModule],
  providers: [StripeService, PaymentsService],
  controllers: [PaymentsController],
  exports: [StripeService, PaymentsService],
})
export class PaymentsModule {}
