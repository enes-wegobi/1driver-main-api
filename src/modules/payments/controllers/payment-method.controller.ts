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
  Patch,
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
import { PaymentMethodService } from '../payment-method.service';
import { AddPaymentMethodDto } from '../dto/add-payment-method.dto';

@ApiTags('payment-methods')
@ApiBearerAuth()
@Controller('payment-methods')
@UseGuards(JwtAuthGuard)
export class PaymentMethodController {
  private readonly logger = new Logger(PaymentMethodController.name);

  constructor(private readonly paymentMethodService: PaymentMethodService) {}

  @Post()
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
    description: 'Customer not found',
  })
  async addPaymentMethod(
    @GetUser() user: IJwtPayload,
    @Body() body: AddPaymentMethodDto,
  ) {
    try {
      return await this.paymentMethodService.addPaymentMethod(
        user.userId,
        body.paymentMethodId,
        body.name,
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
}
