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
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { DriversService } from './drivers.service';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { v4 as uuidv4 } from 'uuid';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('upload/:fileType')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
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
