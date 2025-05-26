import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  Param,
  HttpException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { PaymentsService } from '../payments.service';
import { CreatePaymentIntentDto } from '../dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payment-intent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment intent created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found or does not have a Stripe account',
  })
  async createPaymentIntent(
    @GetUser() user: IJwtPayload,
    @Body() body: CreatePaymentIntentDto,
  ) {
    try {
      return await this.paymentsService.processPayment(
        user.userId,
        body.amount,
        body.currency,
        body.paymentMethodId,
        body.metadata,
      );
    } catch (error) {
      this.logger.error(
        `Error creating payment intent: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while creating payment intent',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('payment-intent/:paymentIntentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment intent details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment intent retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment intent ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment intent not found',
  })
  async getPaymentIntent(
    @GetUser() user: IJwtPayload,
    @Param('paymentIntentId') paymentIntentId: string,
  ) {
    try {
      return await this.paymentsService.getPaymentIntent(paymentIntentId);
    } catch (error) {
      this.logger.error(
        `Error getting payment intent: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while getting payment intent',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer payment history' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment history retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Error retrieving payment history',
  })
  async getPaymentHistory(@GetUser() user: IJwtPayload) {
    try {
      return await this.paymentsService.getPaymentHistory(user.userId);
    } catch (error) {
      this.logger.error(
        `Error getting payment history: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while getting payment history',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':paymentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get payment details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async getPaymentById(
    @GetUser() user: IJwtPayload,
    @Param('paymentId') paymentId: string,
  ) {
    try {
      const payment = await this.paymentsService.getPaymentById(paymentId);

      if (!payment) {
        throw new HttpException('Payment not found', HttpStatus.NOT_FOUND);
      }

      // Ensure the user can only access their own payments
      if (payment.customerId !== user.userId) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      return payment;
    } catch (error) {
      this.logger.error(
        `Error getting payment details: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while getting payment details',
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.BAD_REQUEST,
      );
    }
  }
}
