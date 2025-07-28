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
import { UnifiedUserRedisService } from 'src/redis/services/unified-user-redis.service';
import { UserType } from 'src/common/user-type.enum';
import { LoggerService } from 'src/logger/logger.service';
import { UpdateAppStateDto } from './dto/update-app-state.dto';
import { TokenValidationResponseDto } from 'src/modules/common/dto/token-validation-response.dto';
import { TokenManagerService } from 'src/redis/services/token-manager.service';

@ApiTags('common')
@ApiBearerAuth()
@Controller('common')
@UseGuards(JwtAuthGuard)
export class CommonController {
  constructor(
    private readonly unifiedUserRedisService: UnifiedUserRedisService,
    private readonly tokenManagerService: TokenManagerService,
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
      await this.unifiedUserRedisService.updateUserActivity(userId, userType);
      await this.unifiedUserRedisService.updateAppState(
        userId,
        userType,
        payload.state,
      );

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
}
