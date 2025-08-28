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
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateDriverDto } from '../../../clients/auth/dto/create-driver.dto';
import { ValidateOtpDto } from '../../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../../clients/auth/dto/signin.dto';
import { TokenManagerService } from '../../../redis/services/token-manager.service';
import { UserType } from '../../../common/user-type.enum';
import { ConfigService } from '@nestjs/config';
import { LogoutGuard } from '../../../jwt/guards/logout.guard';
import { LoggerService } from 'src/logger/logger.service';
import { ForceLogoutService } from '../services/force-logout.service';
import { AuthService } from '../services/auth.service';

@ApiTags('auth-driver')
@Controller('auth/driver')
export class AuthDriverController {
  private readonly jwtExpiresIn: number;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenManagerService: TokenManagerService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly forceLogoutService: ForceLogoutService,
  ) {
    this.jwtExpiresIn = this.configService.get<number>(
      'jwt.expiresIn',
      2592000,
    ); // Default: 30 days
  }

  @Post('initiate-signup')
  @ApiOperation({ summary: 'Initiate driver registration process' })
  @ApiResponse({ status: 201, description: 'Signup initiated, OTP sent' })
  @ApiResponse({ status: 409, description: 'Driver already exists' })
  async initiateSignup(
    @Body() createDriverDto: CreateDriverDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    try {
      return await this.authService.initiateDriverSignup(createDriverDto);
    } catch (error) {
      this.logger.error(
        `Driver signup initiation error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signup initiation',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-signup')
  @ApiOperation({ summary: 'Complete driver registration with OTP' })
  @ApiResponse({
    status: 200,
    description: 'Registration completed, token returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  async completeSignup(
    @Body() validateOtpDto: ValidateOtpDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    try {
      const result =
        await this.authService.completeDriverSignup(validateOtpDto);

      if (result && result.token && result.driver) {
        const ipAddress = forwardedFor || realIp || 'unknown';
        const finalDeviceId = deviceId || 'unknown-device';

        // Atomically replace existing session with new one
        const existingSession =
          await this.tokenManagerService.replaceActiveToken(
            result.driver._id,
            UserType.DRIVER,
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
            result.driver._id,
            UserType.DRIVER,
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

        this.logger.info('Driver signup completed successfully', {
          driverId: result.driver._id,
          deviceId: finalDeviceId,
          ipAddress,
          hadExistingSession: !!existingSession,
        });
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Driver signup completion error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signup completion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-signin')
  @ApiOperation({ summary: 'Sign in a driver' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async signin(
    @Body() signinDto: SigninDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('x-user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    try {
      return await this.authService.signinDriver(signinDto);
    } catch (error) {
      this.logger.error(`Driver signin error: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred during signin',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-signin')
  @ApiOperation({ summary: 'Complete sign in a driver' })
  @ApiResponse({ status: 200, description: 'Token generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async completeSignin(
    @Body() validateOtpDto: ValidateOtpDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-forwarded-for') forwardedFor: string,
    @Headers('x-real-ip') realIp: string,
  ) {
    try {
      const result =
        await this.authService.completeDriverSignin(validateOtpDto);

      if (result && result.token && result.driver) {
        const ipAddress = forwardedFor || realIp || 'unknown';
        const finalDeviceId = deviceId || 'unknown-device';
        const userId = result.driver._id;

        // Atomically replace existing session with new one
        const existingSession =
          await this.tokenManagerService.replaceActiveToken(
            userId,
            UserType.DRIVER,
            result.token,
            finalDeviceId,
            this.jwtExpiresIn,
            {
              ipAddress,
              userAgent,
            },
          );

        // If there was an existing session on a different device, execute force logout
        if (existingSession) {
          await this.forceLogoutService.executeForceLogout(
            userId,
            UserType.DRIVER,
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
        `Driver complete signin error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred during signin completion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend OTP to driver' })
  @ApiResponse({ status: 200, description: 'OTP resent successfully' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  async resendOtp(@Body() signinDto: SigninDto) {
    try {
      return await this.authService.resendDriverOtp(signinDto);
    } catch (error) {
      this.logger.error(
        `Driver resend OTP error: ${error.message}`,
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
  @ApiOperation({ summary: 'Logout a driver' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    try {
      return { success: true, message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Driver logout error: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'An error occurred during logout',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
