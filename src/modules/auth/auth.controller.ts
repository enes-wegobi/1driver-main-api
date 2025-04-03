import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('initiate-signup')
  @ApiOperation({ summary: 'Initiate customer registration process' })
  @ApiResponse({ status: 201, description: 'Signup initiated, OTP sent' })
  @ApiResponse({ status: 409, description: 'Customer already exists' })
  async initiateSignup(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      return await this.authService.initiateCustomerSignup(createCustomerDto);
    } catch (error) {
      this.logger.error(
        `User signup initiation error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signup initiation',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-signup')
  @ApiOperation({ summary: 'Complete customer registration with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Registration completed, token returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async completeSignup(@Body() validateOtpDto: ValidateOtpDto) {
    try {
      return await this.authService.completeCustomerSignup(validateOtpDto);
    } catch (error) {
      this.logger.error(
        `User signup completion error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signup completion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-signin')
  @ApiOperation({ summary: 'Sign in a customer' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async signin(@Body() signinDto: SigninDto) {
    try {
      return await this.authService.signinCustomer(signinDto);
    } catch (error) {
      this.logger.error(`User signin error: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred during signin',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-signin')
  @ApiOperation({ summary: 'Complete sign in a customer' })
  @ApiResponse({ status: 200, description: 'Token generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async completeSignin(@Body() validateOtpDto: ValidateOtpDto) {
    try {
      return await this.authService.completeCustomerSignin(validateOtpDto);
    } catch (error) {
      this.logger.error(
        `User complete signin error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signin completion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
