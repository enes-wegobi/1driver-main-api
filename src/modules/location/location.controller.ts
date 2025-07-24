import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { LocationService } from './location.service';
import { UserType } from 'src/common/user-type.enum';
import { DriverLocationDto } from 'src/websocket/dto/driver-location.dto';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('location')
@ApiBearerAuth()
@Controller('location')
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly logger: LoggerService,
  ) {}

  @Post('driver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update driver location',
    description:
      'Update driver location and notify customers if on active trip',
  })
  @ApiBody({ type: DriverLocationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only drivers can update driver location',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to process location update',
  })
  async updateDriverLocation(
    @GetUser() user: IJwtPayload,
    @Body() payload: DriverLocationDto,
  ) {
    if (!user.userId) {
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    if (user.userType !== UserType.DRIVER) {
      return {
        success: false,
        message: 'Only drivers can update driver location',
      };
    }

    try {
      const result = await this.locationService.updateDriverLocation(
        user.userId,
        payload,
      );

      return {
        success: true,
        message: 'Location updated successfully',
        timestamp: new Date().toISOString(),
        ...result,
      };
    } catch (error) {
      this.logger.error(
        `Error processing driver location update: ${error.message}`,
      );
      return {
        success: false,
        message: 'Failed to process location update',
      };
    }
  }
}
