import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Param,
  Delete,
  HttpException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { PaymentMethodService } from '../services/payment-method.service';
import { CreateSetupIntentDto, SavePaymentMethodDto } from '../dto';
import { LoggerService } from 'src/logger/logger.service';
import { FakeSavePaymentMethodDto } from '../dto/fake.dto';

@ApiTags('payment-methods')
@ApiBearerAuth()
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodController {
  constructor(
    private readonly paymentMethodService: PaymentMethodService,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save payment method from Setup Intent (Uber-style)',
    description:
      'Validates the Setup Intent and saves the payment method to the customer account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method saved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Setup Intent validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Setup Intent does not belong to this customer',
  })
  async addPaymentMethod(
    @GetUser() user: IJwtPayload,
    @Body() body: SavePaymentMethodDto,
  ) {
    try {
      return await this.paymentMethodService.savePaymentMethodFromSetupIntent(
        user.userId,
        body.setupIntentId,
        body.paymentMethodId,
        body.name,
      );
    } catch (error) {
      this.logger.error(
        `Error saving payment method from setup intent: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while saving payment method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('fake')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save payment method from Setup Intent (Uber-style)',
    description:
      'Validates the Setup Intent and saves the payment method to the customer account',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment method saved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Setup Intent validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Setup Intent does not belong to this customer',
  })
  async addFakePaymentMethod(
    @GetUser() user: IJwtPayload,
    @Body() body: FakeSavePaymentMethodDto,
  ) {
    try {
      return await this.paymentMethodService.saveFakePaymentMethodFromSetupIntent(
        user.userId,
        body.paymentMethodId,
        body.name,
      );
    } catch (error) {
      this.logger.error(
        `Error saving payment method from setup intent: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while saving payment method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer payment methods' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment methods retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async getPaymentMethods(@GetUser() user: IJwtPayload) {
    try {
      return await this.paymentMethodService.getPaymentMethods(user.userId);
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

  @Get('default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get customer default payment method' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default payment method retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found or does not have a default payment method',
  })
  async getDefaultPaymentMethod(@GetUser() user: IJwtPayload) {
    try {
      const defaultPaymentMethod =
        await this.paymentMethodService.getDefaultPaymentMethod(user.userId);

      if (!defaultPaymentMethod) {
        return { message: 'No default payment method set' };
      }

      return defaultPaymentMethod;
    } catch (error) {
      this.logger.error(
        `Error getting default payment method: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message ||
          'An error occurred while getting default payment method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set a payment method as default' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default payment method set successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment method ID',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment method not found',
  })
  async setDefaultPaymentMethod(
    @GetUser() user: IJwtPayload,
    @Param('id') id: string,
  ) {
    try {
      return await this.paymentMethodService.setDefaultPaymentMethod(
        user.userId,
        id,
      );
    } catch (error) {
      this.logger.error(
        `Error setting default payment method: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message ||
          'An error occurred while setting default payment method',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
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
    @Param('id') id: string,
  ) {
    try {
      return await this.paymentMethodService.deletePaymentMethod(
        user.userId,
        id,
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

  @Post('setup-intent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a Setup Intent for adding payment methods',
    description:
      'Creates a Setup Intent that allows the frontend to securely collect and validate payment method details',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Setup Intent created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Customer does not have a Stripe account',
  })
  async createSetupIntent(
    @GetUser() user: IJwtPayload,
    @Body() body: CreateSetupIntentDto,
  ) {
    try {
      return await this.paymentMethodService.createSetupIntent(
        user.userId,
        body.metadata,
      );
    } catch (error) {
      this.logger.error(
        `Error creating setup intent: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.message || 'An error occurred while creating setup intent',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
