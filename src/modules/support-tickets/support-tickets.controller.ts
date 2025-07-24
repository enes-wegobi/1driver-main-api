import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Body,
} from '@nestjs/common';
import { GetUser } from 'src/jwt/user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { SupportTicketsService } from './support-tickets.service';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { S3Service } from 'src/s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { UserType } from 'src/common/user-type.enum';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('support-tickets')
@ApiBearerAuth()
@Controller('support-tickets')
@UseGuards(JwtAuthGuard)
export class SupportTicketsController {
  constructor(
    private readonly supportTicketsService: SupportTicketsService,
    private readonly s3Service: S3Service,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer support ticket' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Subject of the support ticket',
        },
        description: {
          type: 'string',
          description: 'Description of the support ticket',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (optional)',
        },
      },
      required: ['subject', 'description'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Customer support ticket created successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: IJwtPayload,
    @Body() createSupportTicketDto: CreateSupportTicketDto,
  ) {
    let fileKey: string | null = null;
    let fileUrl: string | null = null;

    if (file) {
      try {
        fileKey = `support-tickets/customers/${user.userId}/${uuidv4()}-${file.originalname}`;
        await this.s3Service.uploadFileWithKey(file, fileKey);
        fileUrl = await this.s3Service.getPublicUrl(fileKey);
      } catch (error) {
        this.logger.error('File upload failed:', error);
        throw new BadRequestException('File upload failed.');
      }
    }

    return this.supportTicketsService.create(
      user.userId,
      UserType.CUSTOMER,
      createSupportTicketDto.subject,
      createSupportTicketDto.description,
      fileUrl,
    );
  }

  @Post('driver')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a driver support ticket' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Subject of the support ticket',
        },
        description: {
          type: 'string',
          description: 'Description of the support ticket',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (optional)',
        },
      },
      required: ['subject', 'description'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Driver support ticket created successfully',
  })
  @UseInterceptors(FileInterceptor('file'))
  async createDriverTicket(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: IJwtPayload,
    @Body() createSupportTicketDto: CreateSupportTicketDto,
  ) {
    let fileKey: string | null = null;
    let fileUrl: string | null = null;

    if (file) {
      try {
        fileKey = `support-tickets/drivers/${user.userId}/${uuidv4()}-${file.originalname}`;
        await this.s3Service.uploadFileWithKey(file, fileKey);
        fileUrl = this.s3Service.getPublicUrl(fileKey);
      } catch (error) {
        this.logger.error('File upload failed:', error);
        throw new BadRequestException('File upload failed.');
      }
    }

    return this.supportTicketsService.create(
      user.userId,
      UserType.DRIVER,
      createSupportTicketDto.subject,
      createSupportTicketDto.description,
      fileUrl,
    );
  }
}
