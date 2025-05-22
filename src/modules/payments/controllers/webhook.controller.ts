import {
  Controller,
  Post,
  Headers,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from '../payments.service';
import { FastifyRequest } from 'fastify';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: FastifyRequest,
  ) {
    try {
      this.logger.log('Received Stripe webhook');
      
      if (!signature) {
        this.logger.error('Missing Stripe signature header');
        return { success: false, error: 'Missing Stripe signature header' };
      }

      const rawBody = (request as any).rawBody;
      if (!rawBody) {
        this.logger.error('Missing raw body in request');
        return { success: false, error: 'Missing raw body in request' };
      }

      const result = await this.paymentsService.handleWebhookEvent(signature, Buffer.from(rawBody));
      return { success: true, type: result.type };
    } catch (error) {
      this.logger.error(`Error handling webhook: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }
}
