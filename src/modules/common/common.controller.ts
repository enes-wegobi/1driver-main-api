import {
  Controller,
  Put,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  HttpException,
  Get,
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
import { MobileConfigResponseDto } from './dto/mobile-config-response.dto';

@ApiTags('common')
@ApiBearerAuth()
@Controller('common')
@UseGuards(JwtAuthGuard)
export class CommonController {
  constructor(
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
    private readonly tokenManagerService: TokenManagerService,
    //private readonly mobileConfigService: MobileConfigService,
    private readonly logger: LoggerService,
  ) {}

  @Put('app-state')
  @HttpCode(HttpStatus.OK)
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

  @Get('mobile-config')
  @UseGuards()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get mobile app configuration',
    description: 'Returns configuration settings for mobile applications including build version, OTP expiration time, and trip cancellation timeout',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mobile configuration retrieved successfully',
    type: MobileConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve mobile configuration',
  })
  async getMobileConfig() {
    try {
      this.logger.info('Fetching mobile configuration');
      //return await this.mobileConfigService.getMobileConfig();
    } catch (error) {
      this.logger.error(
        `Error fetching mobile config: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        'Failed to retrieve mobile configuration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
