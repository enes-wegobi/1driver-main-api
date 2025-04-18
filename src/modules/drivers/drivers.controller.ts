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
  ConflictException,
  NotFoundException,
  Get,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { DriversService } from './drivers.service';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { S3Service } from 'src/s3/s3.service';
import { FileType } from './enum/file-type.enum';
import { DriverFilesStatusDto } from './dto/file-status.dto';

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

  @Get('me/files')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all files and their status for the current driver' })
  @ApiResponse({
    status: 200,
    description: 'Returns all files with their status and whether the driver can use the app',
    type: DriverFilesStatusDto,
  })
  async getMyFiles(@GetUser() user: IJwtPayload) {
    try {
      this.logger.log(`Getting files for driver ID: ${user.userId}`);
      return await this.driversService.getDriverFiles(user.userId);
    } catch (error) {
      this.logger.error(
        `Error fetching driver files: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching driver files',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':driverId/files')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all files and their status for a specific driver' })
  @ApiParam({
    name: 'driverId',
    description: 'ID of the driver',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all files with their status and whether the driver can use the app',
    type: DriverFilesStatusDto,
  })
  async getDriverFiles(@Param('driverId') driverId: string) {
    try {
      this.logger.log(`Getting files for driver ID: ${driverId}`);
      return await this.driversService.getDriverFiles(driverId);
    } catch (error) {
      this.logger.error(
        `Error fetching driver files: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching driver files',
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
    description: 'Yüklenecek dosya türü',
    example: FileType.DRIVERS_LICENSE_FRONT
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
        // Delete the existing file before uploading a new one
        const existingFileKey = await this.driversService.deleteFile(
          user.userId,
          fileType,
        );
        if (existingFileKey) {
          await this.s3Service.deleteFile(existingFileKey);
        }
        this.logger.log(`Deleted existing file of type ${fileType} for user ${user.userId}`);
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
    example: FileType.DRIVERS_LICENSE_FRONT
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
    example: FileType.DRIVERS_LICENSE_FRONT
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
        case FileType.CRIMINAL_RECORD:
          return await this.driversService.verifyCriminalRecord(
            user.userId,
            isVerified,
          );
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
}
