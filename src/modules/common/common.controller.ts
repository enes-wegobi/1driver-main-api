import {
  Controller,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  HttpException,
  Get,
  Post,
  Request,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { UserType } from 'src/common/user-type.enum';
import { LoggerService } from 'src/logger/logger.service';
import { UpdateAppStateDto } from './dto/update-app-state.dto';
import { TokenValidationResponseDto } from 'src/modules/common/dto/token-validation-response.dto';
import { TokenManagerService } from 'src/redis/services/token-manager.service';
import { AppStartupRequestDto } from './dto/app-startup-request.dto';
import { AppStartupResponseDto } from './dto/app-startup-response.dto';
import { AppVersionService } from './services/app-version.service';
import { AppType } from './enums/app-type.enum';
import { ConfigService } from 'src/config/config.service';
import { ConfigResponseDto } from './dto/config-response.dto';

@ApiTags('common')
@Controller('common')
export class CommonController {
  constructor(
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly tokenManagerService: TokenManagerService,
    private readonly appVersionService: AppVersionService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  @Put('app-state')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update app state',
    description: 'Updates the user app state (foreground/background)',
  })
  @ApiBody({ type: UpdateAppStateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'App state updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
        state: { type: 'string', example: 'background' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid app state',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to update app state',
  })
  async updateAppState(
    @GetUser() user: IJwtPayload,
    @Body() payload: UpdateAppStateDto,
  ) {
    const userId = user.userId;
    const userType = user.userType;

    this.logger.info(
      `Updating app state to ${payload.state} for user id: ${userId}, user type: ${userType}`,
    );

    try {
      if (userType === UserType.DRIVER) {
        await this.driverStatusService.updateDriverHeartbeat(userId);
        await this.driverStatusService.updateDriverAppState(
          userId,
          payload.state,
        );
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsActive(userId);
        await this.customerStatusService.updateCustomerAppState(
          userId,
          payload.state,
        );
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        state: payload.state,
      };
    } catch (error) {
      this.logger.error(
        `Error updating app state for user ${userId}: ${error.message}`,
      );
      throw new HttpException(
        'Failed to update app state',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('validate-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Token validation result',
    type: TokenValidationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid token' })
  async validateToken(
    @Request() req: any,
  ): Promise<TokenValidationResponseDto> {
    try {
      const user = req.user;
      const sessionInfo = await this.tokenManagerService.getActiveToken(
        user.userId,
        user.userType,
      );

      return {
        isValid: true,
        userId: user.userId,
        userType: user.userType,
        expiresAt: user.exp,
        sessionInfo: sessionInfo
          ? {
              deviceId: sessionInfo.deviceId,
              ipAddress: sessionInfo.ipAddress,
              lastSeenAt: sessionInfo.lastSeenAt,
              createdAt: sessionInfo.createdAt,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Token validation error: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Token validation failed',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  @Get('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get app configuration',
    description: 'Returns configuration settings for applications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuration retrieved successfully',
    type: ConfigResponseDto,
  })
  async getConfig(): Promise<ConfigResponseDto> {
    return {
      otpExpirySeconds: this.configService.mobileOtpExpiryMinutes * 60,
      tripCancellableTimeSeconds:
        this.configService.mobileTripCancellableTimeMinutes * 60,
    };
  }

  @Post('driver/check-version')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'App startup version check',
    description:
      'Checks if app version requires force update based on app type',
  })
  @ApiBody({ type: AppStartupRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version check completed successfully',
    type: AppStartupResponseDto,
  })
  async checkDriverAppStartup(
    @Body() payload: AppStartupRequestDto,
  ): Promise<AppStartupResponseDto> {
    return this.appVersionService.checkForceUpdate(
      AppType.DRIVER,
      payload.version,
    );
  }

  @Post('customer/check-version')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'App startup version check',
    description:
      'Checks if app version requires force update based on app type',
  })
  @ApiBody({ type: AppStartupRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Version check completed successfully',
    type: AppStartupResponseDto,
  })
  async checkCustomerAppStartup(
    @Body() payload: AppStartupRequestDto,
  ): Promise<AppStartupResponseDto> {
    return this.appVersionService.checkForceUpdate(
      AppType.CUSTOMER,
      payload.version,
    );
  }
}
