import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
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
import { ForceLogoutService } from './force-logout.service';

@ApiTags('auth-customer')
@Controller('auth/customer')
export class AuthCustomerController {
  private readonly jwtExpiresIn: number;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenManagerService: TokenManagerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly forceLogoutService: ForceLogoutService,
  ) {
    this.jwtExpiresIn = this.configService.get<number>('jwt.expiresIn', 2592000); // Default: 30 days
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
    @Headers('user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    try {
      const result =
        await this.authService.completeCustomerSignup(validateOtpDto);

      if (result && result.token && result.customer) {
        const ipAddress = forwardedFor || realIp || 'unknown';
        const finalDeviceId = deviceId || 'unknown-device';

        // Check for existing session and handle force logout if needed
        const existingSession = await this.tokenManagerService.storeActiveToken(
          result.customer.id,
          UserType.CUSTOMER,
          result.token,
          finalDeviceId,
          this.jwtExpiresIn,
          {
            ipAddress,
            userAgent,
          },
        );

        // If there was an existing session, execute force logout
        if (existingSession && existingSession.deviceId !== finalDeviceId) {
          await this.forceLogoutService.executeForceLogout(
            result.customer.id,
            UserType.CUSTOMER,
            existingSession.deviceId,
            finalDeviceId,
            'new_device_signup',
            {
              ipAddress,
              userAgent,
              oldSessionInfo: existingSession,
            },
          );
        }
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
    @Headers('user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    try {
      const result =
        await this.authService.completeCustomerSignin(validateOtpDto);

      if (result && result.token && result.customer) {
        const ipAddress = forwardedFor || realIp || 'unknown';
        const finalDeviceId = deviceId || 'unknown-device';
        const userId = result.customer._id;

        // Get existing session before storing new one
        const existingSession = await this.tokenManagerService.getActiveToken(
          userId,
          UserType.CUSTOMER,
        );

        // Store new active session with metadata
        await this.tokenManagerService.storeActiveToken(
          userId,
          UserType.CUSTOMER,
          result.token,
          finalDeviceId,
          this.jwtExpiresIn,
          {
            ipAddress,
            userAgent,
          },
        );

        // If there was an existing session on a different device, execute force logout
        if (existingSession && existingSession.deviceId !== finalDeviceId) {
          await this.forceLogoutService.executeForceLogout(
            userId,
            UserType.CUSTOMER,
            existingSession.deviceId,
            finalDeviceId,
            'new_device_signin',
            {
              ipAddress,
              userAgent,
              oldSessionInfo: existingSession,
            },
          );
        }
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
