import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  HttpException,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { HeartbeatDto } from 'src/websocket/dto/heartbeat.dto';
import { DriverStatusService } from 'src/redis/services/driver-status.service';
import { CustomerStatusService } from 'src/redis/services/customer-status.service';
import { UserType } from 'src/common/user-type.enum';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

@ApiTags('heartbeat')
@ApiBearerAuth()
@Controller('heartbeat')
@UseGuards(JwtAuthGuard)
export class HeartbeatController {
  private readonly logger = new Logger(HeartbeatController.name);

  constructor(
    private readonly driverStatusService: DriverStatusService,
    private readonly customerStatusService: CustomerStatusService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send heartbeat to maintain user session',
    description:
      'Updates user status and app state for both drivers and customers',
  })
  @ApiBody({ type: HeartbeatDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Heartbeat processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
        nextHeartbeatIn: { type: 'number', example: 30000 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to process heartbeat',
  })
  async sendHeartbeat(
    @GetUser() user: IJwtPayload,
    @Body() payload: HeartbeatDto,
  ) {
    const userId = user.userId;
    const userType = user.userType;

    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    try {
      // Update user status based on type
      if (userType === UserType.DRIVER) {
        await this.driverStatusService.updateDriverHeartbeat(userId);
        await this.driverStatusService.updateDriverAppState(
          userId,
          payload.appState,
        );

        this.logger.debug(
          `Heartbeat from driver ${userId}, appState: ${payload.appState}`,
        );
      } else if (userType === UserType.CUSTOMER) {
        await this.customerStatusService.markCustomerAsActive(userId);
        await this.customerStatusService.updateCustomerAppState(
          userId,
          payload.appState,
        );
        this.logger.debug(
          `Heartbeat from customer ${userId}, appState: ${payload.appState}`,
        );
      }

      return {
        success: true,
        timestamp: new Date().toISOString(),
        nextHeartbeatIn: HEARTBEAT_INTERVAL,
      };
    } catch (error) {
      this.logger.error(
        `Error processing heartbeat from user ${userId}: ${error.message}`,
      );
      throw new HttpException(
        'Failed to process heartbeat',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
