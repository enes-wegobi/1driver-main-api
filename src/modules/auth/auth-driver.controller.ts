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
import { CreateDriverDto } from '../../clients/auth/dto/create-driver.dto';
import { ValidateOtpDto } from '../../clients/auth/dto/validate-otp.dto';
import { SigninDto } from '../../clients/auth/dto/signin.dto';

@ApiTags('auth-driver')
@Controller('auth/driver')
export class AuthDriverController {
  private readonly logger = new Logger(AuthDriverController.name);

  constructor(private readonly authService: AuthService) {}

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
  async completeSignup(@Body() validateOtpDto: ValidateOtpDto) {
    try {
      return await this.authService.completeDriverSignup(validateOtpDto);
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
  async completeSignin(@Body() validateOtpDto: ValidateOtpDto) {
    try {
      return await this.authService.completeDriverSignin(validateOtpDto);
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
}
