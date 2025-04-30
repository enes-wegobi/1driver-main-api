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
import { DriverFilesStatusDto } from './dto/file-status.dto';
import {
  BankInformationDto,
  CreateBankInformationDto,
} from './dto/bank-information.dto';
import {
  CompanyInformationDto,
  CreateCompanyInformationDto,
} from './dto/company-information.dto';

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
}
