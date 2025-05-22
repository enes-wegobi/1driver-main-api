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
  Delete,
  HttpException,
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
import { PaymentsService } from './payments.service';
import { AddPaymentMethodDto, CreatePaymentIntentDto } from './dto';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('payment-methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a payment method to the customer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment method ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found or does not have a Stripe account',
  })
  async addPaymentMethod(
    @GetUser() user: IJwtPayload,
    @Body() body: AddPaymentMethodDto,
  ) {
    try {
      return await this.paymentsService.addPaymentMethod(
        user.userId,
        body.paymentMethodId,
      );
    } catch (error) {
      this.logger.error(
        `Error adding payment method: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while adding payment method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('payment-methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer payment methods' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment methods retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found or does not have a Stripe account',
  })
  async getPaymentMethods(@GetUser() user: IJwtPayload) {
    try {
      return await this.paymentsService.getPaymentMethods(user.userId);
    } catch (error) {
      this.logger.error(
        `Error getting payment methods: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while getting payment methods',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('payment-methods/:paymentMethodId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a payment method' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment method ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async deletePaymentMethod(
    @GetUser() user: IJwtPayload,
    @Param('paymentMethodId') paymentMethodId: string,
  ) {
    try {
      return await this.paymentsService.deletePaymentMethod(
        user.userId,
        paymentMethodId,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting payment method: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while deleting payment method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

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
}
