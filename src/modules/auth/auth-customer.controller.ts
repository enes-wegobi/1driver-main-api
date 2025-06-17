import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Logger,
  Headers,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateCustomerDto } from '../../clients/auth/dto/create-customer.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';
import { TokenManagerService } from '../../redis/services/token-manager.service';
import { UserType } from '../../common/user-type.enum';
import { ConfigService } from '@nestjs/config';
import { LogoutGuard } from '../../jwt/logout.guard';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('auth-customer')
@Controller('auth/customer')
export class AuthCustomerController {
  private readonly jwtExpiresIn: number;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenManagerService: TokenManagerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.jwtExpiresIn = this.configService.get<number>('jwt.expiresIn', 86400); // Default: 24 hours
  }

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
  async completeSignup(
    @Body() validateOtpDto: ValidateOtpDto,
    @Headers('device-id') deviceId: string,
  ) {
    try {
      const result =
        await this.authService.completeCustomerSignup(validateOtpDto);

      // If successful, store the token
      if (result && result.token && result.customer) {
        await this.tokenManagerService.storeActiveToken(
          result.customer.id,
          UserType.CUSTOMER,
          result.token,
          deviceId || 'unknown-device',
          this.jwtExpiresIn,
        );
      }

      return result;
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
  async completeSignin(
    @Body() validateOtpDto: ValidateOtpDto,
    @Headers('device-id') deviceId: string,
  ) {
    try {
      const result =
        await this.authService.completeCustomerSignin(validateOtpDto);

      // If successful, invalidate any existing token and store the new one
      if (result && result.token && result.customer) {
        await this.tokenManagerService.invalidateActiveToken(
          result.customer._id,
          UserType.CUSTOMER,
        );
        await this.tokenManagerService.storeActiveToken(
          result.customer._id,
          UserType.CUSTOMER,
          result.token,
          deviceId || 'unknown-device',
          this.jwtExpiresIn,
        );

        return { token: result.token };
      }

      return result;
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

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP to customer' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async resendOtp(@Body() signinDto: SigninDto) {
    try {
      return await this.authService.resendCustomerOtp(signinDto);
    } catch (error) {
      this.logger.error(
        `Customer resend OTP error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during OTP resend',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('logout')
  @UseGuards(LogoutGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout a customer' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    try {
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Customer logout error: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'An error occurred during logout',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
