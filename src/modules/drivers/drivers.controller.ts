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
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Param,
  ConflictException,
  NotFoundException,
  Get,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { DriversService } from './drivers.service';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { UploadFileDto } from './dto/upload-file.dto';
import { S3Service } from 'src/s3/s3.service';
import { FileType } from './enum/file-type.enum';

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
        throw new ConflictException(
          `A file of type ${fileType} already exists for this user`,
        );
      }

      const fileKey = `${user.userId}/${fileType}/${uuidv4()}-${file.originalname}`;
      await this.s3Service.uploadFileWithKey(file, fileKey);

      await this.driversService.notifyFileUploaded(
        user.userId,
        fileType,
        fileKey,
        file.mimetype,
      );

      const fileUrl = await this.s3Service.getSignedUrl(fileKey, 3600);
      return {
        message: 'File uploaded successfully',
        fileKey,
        fileType: fileType,
        fileUrl,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
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
}
