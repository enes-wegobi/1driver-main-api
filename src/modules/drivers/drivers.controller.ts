import {
  Controller,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  BadRequestException,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  NotFoundException,
  Get,
  Put,
  Patch,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { DriversService } from './drivers.service';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { S3Service } from 'src/s3/s3.service';
import { FileType } from './enum/file-type.enum';
import {
  BankInformationDto,
  CreateBankInformationDto,
} from './dto/bank-information.dto';
import { InitiateEmailUpdateDto } from 'src/clients/customer/dto/initiate-email-update.dto';
import { CompleteEmailUpdateDto } from 'src/clients/customer/dto/complete-email-update.dto';
import { InitiatePhoneUpdateDto } from 'src/clients/customer/dto/initiate-phone-update.dto';
import { CompletePhoneUpdateDto } from 'src/clients/customer/dto/complete-phone-update.dto';
import { UpdateNotificationPermissionsDto } from 'src/clients/driver/dto/update-notification-permissions.dto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';

@ApiTags('drivers')
@ApiBearerAuth()
@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  private readonly logger = new Logger(DriversController.name);

  constructor(
    private readonly driversService: DriversService,
    private readonly s3Service: S3Service,
  ) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getProfile(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting profile for customer ID: ${user.userId}`);
      return await this.driversService.findOne(user.userId);
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

  @Post('upload/:fileType')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Dosya yükleme' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'fileType',
    enum: FileType,
    description: 'File type',
    example: FileType.DRIVERS_LICENSE_FRONT,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Yüklenecek dosya (png, jpeg, jpg, pdf)',
        },
      },
      required: ['file'],
    },
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Param('fileType') fileType: FileType,
    @GetUser() user: IJwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const fileExists = await this.driversService.checkFileExists(
        user.userId,
        fileType,
      );

      if (fileExists) {
        const existingFileKey = await this.driversService.deleteFile(
          user.userId,
          fileType,
        );
        if (existingFileKey) {
          await this.s3Service.deleteFile(existingFileKey);
        }
        this.logger.log(
          `Deleted existing file of type ${fileType} for user ${user.userId}`,
        );
      }

      const fileKey = `${user.userId}/${fileType}/${uuidv4()}-${file.originalname}`;
      await this.s3Service.uploadFileWithKey(file, fileKey);

      await this.driversService.notifyFileUploaded(
        user.userId,
        fileType,
        fileKey,
        file.mimetype,
        file.originalname,
      );

      const fileUrl = await this.s3Service.getSignedUrl(fileKey, 3600);
      return {
        message: 'File uploaded successfully',
        fileKey,
        fileType: fileType,
        fileUrl,
      };
    } catch (error) {
      this.logger.error('File upload failed:', error);
      throw new BadRequestException('File upload failed.');
    }
  }

  @Delete('files/:fileType')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a specific file type for the current driver',
  })
  @ApiParam({
    name: 'fileType',
    enum: FileType,
    description: 'Type of file to delete',
    example: FileType.DRIVERS_LICENSE_FRONT,
  })
  async deleteFile(
    @Param('fileType') fileType: FileType,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      const fileExists = await this.driversService.checkFileExists(
        user.userId,
        fileType,
      );
      if (!fileExists) {
        throw new NotFoundException(`File of type ${fileType} not found`);
      }

      const fileKey = await this.driversService.deleteFile(
        user.userId,
        fileType,
      );
      if (fileKey) {
        await this.s3Service.deleteFile(fileKey);
      }

      return { message: `File of type ${fileType} deleted successfully` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new HttpException(
        error.response?.data || 'An error occurred while deleting file',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('files/:fileType/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify a file',
    description:
      'Verifies a specific document. For driving license, front and back are verified separately. The file must be uploaded first.',
  })
  @ApiParam({
    name: 'fileType',
    enum: FileType,
    description: 'Type of file to verify',
    example: FileType.DRIVERS_LICENSE_FRONT,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isVerified: {
          type: 'boolean',
          description: 'Whether the file is verified or not',
          example: true,
        },
      },
      required: ['isVerified'],
    },
  })
  async verifyFile(
    @Param('fileType') fileType: FileType,
    @Body('isVerified') isVerified: boolean,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      const fileExists = await this.driversService.checkFileExists(
        user.userId,
        fileType,
      );
      if (!fileExists) {
        throw new NotFoundException(`File of type ${fileType} not found`);
      }

      switch (fileType) {
        case FileType.DRIVERS_LICENSE_FRONT:
          return await this.driversService.verifyDrivingLicenseFront(
            user.userId,
            isVerified,
          );
        case FileType.DRIVERS_LICENSE_BACK:
          return await this.driversService.verifyDrivingLicenseBack(
            user.userId,
            isVerified,
          );
        default:
          throw new NotFoundException(`Invalid file type: ${fileType}`);
      }
    } catch (error) {
      this.logger.error(`Error verifying file: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Bank Information Endpoints
  @Post('bank-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add a new bank information',
    description: 'Add a new bank information for the current driver',
  })
  @ApiBody({ type: CreateBankInformationDto })
  @ApiResponse({
    status: 200,
    description: 'Bank information added successfully',
    type: BankInformationDto,
  })
  async addBankInformation(
    @Body() bankInfoDto: CreateBankInformationDto,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      this.logger.log(`Adding bank information for driver ID: ${user.userId}`);
      const updatedDriver = await this.driversService.addBankInformation(
        user.userId,
        bankInfoDto,
      );
      return updatedDriver;
    } catch (error) {
      this.logger.error(
        `Error adding bank information: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while adding bank information',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('bank-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all bank information',
    description: 'Get all bank information for the current driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank information retrieved successfully',
    type: [BankInformationDto],
  })
  async getAllBankInformation(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting bank information for driver ID: ${user.userId}`);
      return await this.driversService.getAllBankInformation(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching bank information: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while fetching bank information',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('bank-info/:bankInfoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a bank information',
    description: 'Delete a specific bank information for the current driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank information deleted successfully',
  })
  async deleteBankInformation(
    @Param('bankInfoId') bankInfoId: string,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      this.logger.log(
        `Deleting bank information ${bankInfoId} for driver ID: ${user.userId}`,
      );
      return await this.driversService.deleteBankInformation(
        user.userId,
        bankInfoId,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting bank information: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while deleting bank information',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('bank-info/:bankInfoId/set-default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a bank information as default',
    description:
      'Set a specific bank information as the default for the current driver',
  })
  @ApiResponse({
    status: 200,
    description: 'Bank information set as default successfully',
  })
  async setDefaultBankInformation(
    @Param('bankInfoId') bankInfoId: string,
    @GetUser() user: IJwtPayload,
  ) {
    try {
      this.logger.log(
        `Setting bank information ${bankInfoId} as default for driver ID: ${user.userId}`,
      );
      return await this.driversService.setDefaultBankInformation(
        user.userId,
        bankInfoId,
      );
    } catch (error) {
      this.logger.error(
        `Error setting default bank information: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while setting default bank information',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Email and Phone Update Endpoints
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
      return await this.driversService.initiateEmailUpdate(user.userId, dto);
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
      return await this.driversService.completeEmailUpdate(user.userId, dto);
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
      return await this.driversService.initiatePhoneUpdate(user.userId, dto);
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
      return await this.driversService.completePhoneUpdate(user.userId, dto);
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

  @Patch('me/notification-permissions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update driver notification permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification permissions updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Driver not found',
  })
  async updateNotificationPermissions(
    @GetUser() user: IJwtPayload,
    @Body() permissionsDto: UpdateNotificationPermissionsDto,
  ) {
    try {
      this.logger.log(
        `Updating notification permissions for driver ID: ${user.userId}`,
      );
      return await this.driversService.updateNotificationPermissions(
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

  @Patch('me/profile')
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
  async updateProfile(
    @GetUser() user: IJwtPayload,
    @Body() updateProfileDto: UpdateDriverProfileDto,
  ): Promise<any> {
    try {
      return await this.driversService.updateProfile(
        user.userId,
        updateProfileDto,
      );
    } catch (error) {
      this.logger.error(
        `Error updating driver profile: ${error.message}`,
        error.stack,
      );
      throw error;
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
      const fileKey = `profile-photos/drivers/${user.userId}/${uuidv4()}-${file.originalname}`;

      await this.s3Service.uploadFileWithKey(file, fileKey);
      await this.driversService.updatePhoto(user.userId, fileKey);

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
      const result = await this.driversService.deletePhoto(user.userId);
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
      const driver = await this.driversService.findOne(user.userId);

      if (!driver.photoKey) {
        throw new NotFoundException('Profile photo not found');
      }

      const photoUrl = await this.s3Service.getSignedUrl(
        driver.photoKey,
        604800,
      );

      return {
        photoKey: driver.photoKey,
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
}
