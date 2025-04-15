import {
  Controller,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  Patch,
  HttpException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { DriversService } from './drivers.service';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(private readonly driversService: DriversService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current driver profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver profile retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async getProfile(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting profile for driver ID: ${user.userId}`);
      return await this.driversService.findOne(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching driver profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while fetching the driver profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async updateMyProfile(
    @Body() profileData: any,
    @GetUser() user: IJwtPayload,
  ) {
    // Replace 'any' with UpdateDriverDto if available
    try {
      this.logger.log(`Updating profile for driver ID: ${user.userId}`);
      // Replace with actual update method if available
      // return await this.driversService.updateProfile(user.userId, profileData);
      return { message: `Update driver ${user.userId} - Placeholder` }; // Placeholder
    } catch (error) {
      this.logger.error(
        `Error updating driver profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while updating driver profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Example: Delete driver profile
  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete current driver profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Driver deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async removeMyProfile(@GetUser() user) {
    try {
      this.logger.log(`Deleting driver ID: ${user.userId}`);
      // Replace with actual remove method if available
      // return await this.driversService.remove(user.userId);
      return { message: `Delete driver ${user.userId} - Placeholder` }; // Placeholder
    } catch (error) {
      this.logger.error(`Error deleting driver: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting driver',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Add other driver-specific endpoints here as needed
  // e.g., managing vehicles, availability, routes, etc.
}
