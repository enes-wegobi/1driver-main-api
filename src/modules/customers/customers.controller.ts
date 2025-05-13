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
  Logger,
  UseGuards,
  Query,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Put,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { CustomersService } from './customers.service';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { S3Service } from 'src/s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { UpdateCustomerDto } from 'src/clients/customer/dto/update-customer.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { CreateAddressDto } from 'src/clients/customer/dto/create-address.dto';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { UpdateNotificationPermissionsDto } from 'src/clients/customer/dto/update-notification-permissions.dto';
import { NearbyDriversResponseDto } from 'src/modules/trips/dto/nearby-drivers-response.dto';
import {
  NearbyDriversQueryDto,
  SubscribeToNearbyDriversDto,
} from './dto/nearby-drivers.dto';
import { UpdatePhotoDto } from 'src/clients/customer/dto/update-photo.dto';
import { UpdateCustomerExpoTokenDto } from './dto/update-customer-expo-token.dto';

@ApiTags('customer')
@ApiBearerAuth()
@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  private readonly logger = new Logger(CustomersController.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly s3Service: S3Service,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting profile for customer ID: ${user.userId}`);
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
      this.logger.log(`Adding address for user ID: ${user.userId}`);
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
      this.logger.log(
        `Deleting address ${addressId} for user ID: ${user.userId}`,
      );
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
      this.logger.log(
        `Updating notification permissions for user ID: ${user.userId}`,
      );
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
  @Post('subscribe-to-nearby-drivers')
  @ApiOperation({ summary: 'Subscribe to real-time updates of nearby drivers' })
  @ApiResponse({
    status: 200,
    description: 'Successfully subscribed to nearby driver updates',
  })
  async subscribeToNearbyDrivers(
    @Body() subscribeDto: SubscribeToNearbyDriversDto,
    @GetUser() user: IJwtPayload,
  ) {
    this.logger.debug(
      `User ${user.userId} subscribed to nearby driver updates at [${subscribeDto.latitude}, ${subscribeDto.longitude}]`,
    );

    try {
      const success =
        await this.customersService.subscribeToNearbyDriverUpdates(
          user.userId,
          subscribeDto.latitude,
          subscribeDto.longitude,
          subscribeDto.radius,
        );

      return {
        success,
        message: success
          ? 'Successfully subscribed to nearby driver updates'
          : 'Failed to subscribe to nearby driver updates',
      };
    } catch (error) {
      this.logger.error(
        `Error subscribing to nearby drivers: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while subscribing to nearby drivers',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('unsubscribe-from-nearby-drivers')
  @ApiOperation({
    summary: 'Unsubscribe from real-time updates of nearby drivers',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully unsubscribed from nearby driver updates',
  })
  async unsubscribeFromNearbyDrivers(@GetUser() user: IJwtPayload) {
    this.logger.debug(
      `User ${user.userId} unsubscribed from nearby driver updates`,
    );

    try {
      const success =
        await this.customersService.unsubscribeFromNearbyDriverUpdates(
          user.userId,
        );

      return {
        success,
        message: success
          ? 'Successfully unsubscribed from nearby driver updates'
          : 'Failed to unsubscribe from nearby driver updates',
      };
    } catch (error) {
      this.logger.error(
        `Error unsubscribing from nearby drivers: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while unsubscribing from nearby drivers',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

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

      await this.s3Service.uploadFileWithKey(file, fileKey);
      await this.customersService.updatePhoto(user.userId, fileKey);

      const photoUrl = await this.s3Service.getSignedUrl(fileKey, 604800);

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

  @Get('photo-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a fresh signed URL for profile photo' })
  async getProfilePhotoUrl(@GetUser() user: IJwtPayload) {
    try {
      const customer = await this.customersService.findOne(user.userId);

      if (!customer.photoKey) {
        throw new NotFoundException('Profile photo not found');
      }

      const photoUrl = await this.s3Service.getSignedUrl(
        customer.photoKey,
        604800,
      );

      return {
        photoKey: customer.photoKey,
        photoUrl,
      };
    } catch (error) {
      this.logger.error(
        `Error getting profile photo URL: ${error.message}`,
        error.stack,
      );
      throw error;
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
      this.logger.log(`Updating expo token for user ID: ${user.userId}`);
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
      this.logger.log(`Deleting expo token for user ID: ${user.userId}`);
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
}
