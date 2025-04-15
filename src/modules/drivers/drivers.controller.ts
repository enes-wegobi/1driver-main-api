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
  BadRequestException,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  ConflictException,
  NotFoundException,
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
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFileDto } from './dto/upload-file.dto';
import { S3Service } from 'src/s3/s3.service';

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File uploaded successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'File of this type already exists',
  })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|pdf)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @GetUser() user: IJwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    try {
      const fileExists = await this.driversService.checkFileExists(
        user.userId, 
        uploadFileDto.fileType
      );
      
      if (fileExists) {
        throw new ConflictException(`A file of type ${uploadFileDto.fileType} already exists for this user`);
      }

      const fileKey = `${user.userId}/${uploadFileDto.fileType}/${uuidv4()}-${file.originalname}`;

      await this.s3Service.uploadFileWithKey(file, fileKey);
      
      // Notify driver service about the file upload
      await this.driversService.notifyFileUploaded(user.userId, uploadFileDto.fileType, fileKey);
      
      return { 
        message: 'File uploaded successfully', 
        fileKey,
        fileType: uploadFileDto.fileType 
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('File upload failed:', error);
      throw new BadRequestException('File upload failed.');
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
