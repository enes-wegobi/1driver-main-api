import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Param,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { S3Service } from 'src/s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { PromotionClient } from 'src/clients/promotion/promotion.client';
import { LoggerService } from 'src/logger/logger.service';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
    private readonly s3Service: S3Service,
    private readonly promotionClient: PromotionClient,
    private readonly logger: LoggerService,
  ) {}

  @Get('all')
  @ApiOperation({ summary: 'Get all promotions' })
  @ApiResponse({
    status: 200,
    description: 'Returns all available promotions',
  })
  async getAllPromotions() {
    try {
      this.logger.info('Getting all promotions');
      const promotions = await this.promotionsService.getAllPromotions();

      // Add signed URLs for promotions with photos
      const promotionsWithUrls = await Promise.all(
        promotions.map(async (promotion) => {
          if (promotion.photoKey) {
            const photoUrl = await this.s3Service.getSignedUrl(
              promotion.photoKey,
              604800,
            );
            return { ...promotion, photoUrl };
          }
          return promotion;
        }),
      );

      return promotionsWithUrls;
    } catch (error) {
      this.logger.error(
        `Error fetching all promotions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching promotions',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get promotions for the current customer' })
  @ApiResponse({
    status: 200,
    description: 'Returns promotions available for the customer',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found',
  })
  async getMyPromotions(@GetUser() user: IJwtPayload) {
    try {
      this.logger.info(`Getting promotions for customer ID: ${user.userId}`);
      const result = await this.promotionsService.getCustomerPromotions(
        user.userId,
      );

      // Add signed URLs for promotions with photos
      if (result.promotions && result.promotions.length > 0) {
        const promotionsWithUrls = await Promise.all(
          result.promotions.map(async (promotion) => {
            if (promotion.photoKey) {
              const photoUrl = await this.s3Service.getSignedUrl(
                promotion.photoKey,
                604800,
              );
              return { ...promotion, photoUrl };
            }
            return promotion;
          }),
        );

        return {
          ...result,
          promotions: promotionsWithUrls,
        };
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error fetching promotions: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data || 'An error occurred while fetching promotions',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a promotion by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the promotion with the specified ID',
  })
  @ApiResponse({
    status: 404,
    description: 'Promotion not found',
  })
  async getPromotionById(@Param('id') id: string) {
    try {
      this.logger.info(`Getting promotion with ID: ${id}`);

      const promotion = await this.promotionClient.findById(id);

      if (!promotion) {
        throw new NotFoundException(`Promotion with ID ${id} not found`);
      }

      // If the promotion has a photo, generate a signed URL
      if (promotion.photoKey) {
        const photoUrl = await this.s3Service.getSignedUrl(
          promotion.photoKey,
          604800,
        );
        return {
          ...promotion,
          photoUrl,
        };
      }

      return promotion;
    } catch (error) {
      this.logger.error(
        `Error getting promotion: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new promotion' })
  @ApiResponse({
    status: 201,
    description: 'The promotion has been successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the promotion' },
        description: {
          type: 'string',
          description: 'Description of the promotion',
        },
        code: { type: 'string', description: 'Unique code for the promotion' },
        promotionType: {
          type: 'string',
          enum: ['percentage', 'direct'],
          description: 'Type of promotion',
        },
        value: {
          type: 'number',
          description: 'Value of the promotion (percentage or direct amount)',
        },
        userSegment: {
          type: 'string',
          enum: ['first_time_user', 'returning_user', 'vip_user', 'all_users'],
          description: 'User segment for the promotion',
        },
        startDate: {
          type: 'string',
          format: 'date-time',
          description: 'Start date of the promotion',
        },
        endDate: {
          type: 'string',
          format: 'date-time',
          description: 'End date of the promotion',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'expired', 'upcoming', 'all'],
          description: 'Status of the promotion',
        },
        usageLimit: {
          type: 'number',
          description: 'Maximum number of times this promotion can be used',
        },
        userUsageLimit: {
          type: 'number',
          description: 'Maximum number of times a user can use this promotion',
        },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Promotion image (png, jpeg, jpg)',
        },
      },
      required: [
        'name',
        'description',
        'code',
        'promotionType',
        'value',
        'userSegment',
        'startDate',
        'endDate',
      ],
    },
  })
  @UseInterceptors(FileInterceptor('photo'))
  async createPromotion(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      // Parse numeric values from form data
      const createPromotionDto: CreatePromotionDto = {
        ...body,
        value: body.value ? parseFloat(body.value) : undefined,
        usageLimit: body.usageLimit ? parseInt(body.usageLimit, 10) : undefined,
        userUsageLimit: body.userUsageLimit
          ? parseInt(body.userUsageLimit, 10)
          : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      };

      this.logger.info(`Creating new promotion: ${createPromotionDto.name}`);

      // If a file is provided, upload it to S3 and get the key
      if (file) {
        const fileKey = `promotions/${uuidv4()}-${file.originalname}`;
        await this.s3Service.uploadFileWithKey(file, fileKey);
        createPromotionDto.photoKey = fileKey;
        this.logger.info(`Uploaded promotion image with key: ${fileKey}`);
      }

      const promotion =
        await this.promotionsService.createPromotion(createPromotionDto);

      // If a photo was uploaded, generate a signed URL
      if (createPromotionDto.photoKey) {
        const photoUrl = await this.s3Service.getSignedUrl(
          createPromotionDto.photoKey,
          604800,
        );
        return {
          ...promotion,
          photoUrl,
        };
      }

      return promotion;
    } catch (error) {
      this.logger.error(
        `Error creating promotion: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        error.response?.data ||
          'An error occurred while creating the promotion',
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
