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
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateDriverDto } from '../../clients/auth/dto/create-driver.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';
import { TokenManagerService } from '../../redis/services/token-manager.service';
import { UserType } from '../../common/user-type.enum';
import { ConfigService } from '@nestjs/config';
import { LogoutGuard } from '../../jwt/logout.guard';
import { JwtService } from '../../jwt/jwt.service';

@ApiTags('auth-driver')
@Controller('auth/driver')
export class AuthDriverController {
  private readonly logger = new Logger(AuthDriverController.name);
  private readonly jwtExpiresIn: number;

  constructor(
    private readonly authService: AuthService,
    private readonly tokenManagerService: TokenManagerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtExpiresIn = this.configService.get<number>('jwt.expiresIn', 86400); // Default: 24 hours
  }

  @Post('initiate-signup')
  @ApiOperation({ summary: 'Initiate driver registration process' })
  @ApiResponse({ status: 201, description: 'Signup initiated, OTP sent' })
  @ApiResponse({ status: 409, description: 'Driver already exists' })
  async initiateSignup(@Body() createDriverDto: CreateDriverDto) {
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
    @Headers('device-id') deviceId: string,
  ) {
    try {
      const result =
        await this.authService.completeDriverSignup(validateOtpDto);

      // If successful, store the token
      if (result && result.token && result.driver) {
        await this.tokenManagerService.storeActiveToken(
          result.driver.id,
          UserType.DRIVER,
          result.token,
          deviceId || 'unknown-device',
          this.jwtExpiresIn,
        );
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
  async signin(@Body() signinDto: SigninDto) {
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
    @Headers('device-id') deviceId: string,
  ) {
    try {
      const result =
        await this.authService.completeDriverSignin(validateOtpDto);

      // If successful, invalidate any existing token and store the new one
      if (result && result.token && result.driver) {
        await this.tokenManagerService.invalidateActiveToken(
          result.driver._id,
          UserType.DRIVER,
        );
        await this.tokenManagerService.storeActiveToken(
          result.driver._id,
          UserType.DRIVER,
          result.token,
          deviceId || 'unknown-device',
          this.jwtExpiresIn,
        );

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
