import {
  Controller,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  HttpException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { CustomersService } from './customers.service';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { S3Service } from 'src/s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { UpdateNotificationPermissionsDto } from 'src/clients/customer/dto/update-notification-permissions.dto';
import { UpdateCustomerExpoTokenDto } from './dto/update-customer-expo-token.dto';
import {
  CompleteEmailUpdateDto,
  CompletePhoneUpdateDto,
  CreateAddressDto,
  InitiateEmailUpdateDto,
  InitiatePhoneUpdateDto,
  UpdateCustomerDto,
} from 'src/clients/customer/dto';
import { UpdateRateDto } from 'src/common/dto/update-rate.dto';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('customer')
@ApiBearerAuth()
@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly s3Service: S3Service,
    private readonly logger: LoggerService,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: IJwtPayload) {
    try {
      return await this.customersService.findOne(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching the profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer profile information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async updateProfile(
    @Body() profileData: UpdateCustomerDto,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      return await this.customersService.updateProfile(
        user.userId,
        profileData,
      );
    } catch (error) {
      this.logger.error(
        `Error updating profile: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while updating profile',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deleted successfully' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async remove(@GetUser() user: IJwtPayload) {
    try {
      return await this.customersService.remove(user.userId);
    } catch (error) {
      this.logger.error(
        `Error deleting customer: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting customer',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-email-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate email update process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent to new email' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already in use or same as current',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  async initiateEmailUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: InitiateEmailUpdateDto,
  ) {
    try {
      return await this.customersService.initiateEmailUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error initiating email update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while initiating email update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-email-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete email update with OTP verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Email updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OTP or user ID',
  })
  async completeEmailUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: CompleteEmailUpdateDto,
  ) {
    try {
      return await this.customersService.completeEmailUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error completing email update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while completing email update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('initiate-phone-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate phone update process' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OTP sent to new phone' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone already in use or same as current',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid user ID',
  })
  async initiatePhoneUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: InitiatePhoneUpdateDto,
  ) {
    try {
      return await this.customersService.initiatePhoneUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error initiating phone update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while initiating phone update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('complete-phone-update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete phone update with OTP verification' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Phone updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid OTP or user ID',
  })
  async completePhoneUpdate(
    @GetUser() user: IJwtPayload,
    @Body() dto: CompletePhoneUpdateDto,
  ) {
    try {
      return await this.customersService.completePhoneUpdate(user.userId, dto);
    } catch (error) {
      this.logger.error(
        `Error completing phone update: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while completing phone update',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address for customer' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Address added successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or user ID',
  })
  async addAddress(
    @GetUser() user: IJwtPayload,
    @Body() addressDto: CreateAddressDto,
  ) {
    try {
      return await this.customersService.addAddress(user.userId, addressDto);
    } catch (error) {
      this.logger.error(`Error adding address: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while adding address',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('me/addresses/:addressId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Address not found',
  })
  async deleteAddress(@GetUser() user, @Param('addressId') addressId: string) {
    try {
      return await this.customersService.deleteAddress(user.userId, addressId);
    } catch (error) {
      this.logger.error(
        `Error deleting address: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting address',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch('me/notification-permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer notification permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification permissions updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async updateNotificationPermissions(
    @GetUser() user: IJwtPayload,
    @Body() permissionsDto: UpdateNotificationPermissionsDto,
  ) {
    try {
      return await this.customersService.updateNotificationPermissions(
        user.userId,
        permissionsDto,
      );
    } catch (error) {
      this.logger.error(
        `Error updating notification permissions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while updating notification permissions',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  /*
  @Get('nearby-drivers')
  @ApiOperation({ summary: 'Get nearby available drivers' })
  @ApiQuery({
    name: 'latitude',
    description: 'Latitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'longitude',
    description: 'Longitude coordinate',
    required: true,
  })
  @ApiQuery({
    name: 'radius',
    description: 'Search radius in kilometers',
    required: false,
    default: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'List of nearby available drivers',
    type: NearbyDriversResponseDto,
  })
  async getNearbyDrivers(
    @Query(ValidationPipe) query: NearbyDriversQueryDto,
    @GetUser() user: IJwtPayload,
  ): Promise<NearbyDriversResponseDto> {
    this.logger.debug(
      `User ${user.userId} requested nearby drivers at [${query.latitude}, ${query.longitude}]`,
    );

    try {
      return await this.customersService.findNearbyDrivers(
        query.latitude,
        query.longitude,
        query.radius,
      );
    } catch (error) {
      this.logger.error(
        `Error finding nearby drivers: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while finding nearby drivers',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
*/
  @Post('photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Profile photo (png, jpeg, jpg)',
        },
      },
      required: ['photo'],
    },
  })
  async uploadProfilePhoto(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: IJwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('Photo is required');
    }

    try {
      const fileKey = `profile-photos/customers/${user.userId}/${uuidv4()}-${file.originalname}`;
      const photoUrl = this.s3Service.getPublicUrl(fileKey);
      await this.s3Service.uploadFileWithKey(file, fileKey);
      await this.customersService.updatePhoto(user.userId, photoUrl);

      // Get both signed URL (for backward compatibility) and permanent public URL

      return {
        message: 'Profile photo uploaded successfully',
        photoKey: fileKey,
        photoUrl,
      };
    } catch (error) {
      this.logger.error('Profile photo upload failed:', error);
      throw new BadRequestException('Profile photo upload failed.');
    }
  }

  @Delete('photo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete profile photo' })
  async deleteProfilePhoto(@GetUser() user: IJwtPayload) {
    try {
      const result = await this.customersService.deletePhoto(user.userId);
      return { message: 'Profile photo deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Error deleting profile photo: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while deleting profile photo',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('expo-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer expo token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expo token updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async updateExpoToken(
    @GetUser() user: IJwtPayload,
    @Body() updateExpoTokenDto: UpdateCustomerExpoTokenDto,
  ) {
    try {
      await this.customersService.updateExpoToken(
        user.userId,
        updateExpoTokenDto.expoToken,
      );
      return {
        success: true,
        message: 'Expo token updated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error updating expo token: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while updating expo token',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('expo-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete customer expo token' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Expo token deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found',
  })
  async deleteExpoToken(@GetUser() user: IJwtPayload) {
    try {
      await this.customersService.deleteExpoToken(user.userId);
      return {
        success: true,
        message: 'Expo token deleted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Error deleting expo token: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting expo token',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver rating' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rating updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid rate value (must be between 0 and 5)',
  })
  async updateDriverRate(
    @Param('id') driverId: string,
    @Body() updateRateDto: UpdateRateDto,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      await this.customersService.updateDriverRate(
        driverId,
        updateRateDto.rate,
      );
    } catch (error) {
      this.logger.error(
        `Error updating driver rating: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while updating driver rating',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
