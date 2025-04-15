import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { S3Service } from './s3.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { v4 as uuidv4 } from 'uuid';
import { S3FileType } from './s3-file-type.enum';
import { UsersClient } from 'src/clients/users/users.client';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@Controller('s3')
@UseGuards(JwtAuthGuard)
export class S3Controller {
  constructor(
    private readonly s3Service: S3Service,
    private readonly usersClient: UsersClient,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
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
      const fileKey = `${user.userId}/${uploadFileDto.fileType}/${uuidv4()}-${file.originalname}`; 

      await this.s3Service.uploadFileWithKey(file, fileKey);
      await this.usersClient.notifyFileUploaded({
        userId: user.userId,
        fileType: uploadFileDto.fileType,
        fileKey: fileKey,
        fileUrl: await this.s3Service.getSignedUrl(fileKey)
      });

      return { message: 'File uploaded successfully', fileKey };
    } catch (error) {
      console.error('File upload failed:', error);
      throw new BadRequestException('File upload failed.');
    }
  }
}
