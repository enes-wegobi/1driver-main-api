import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { AdminCampaignsService } from '../services/admin-campaigns.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { AdminCampaignsQueryDto } from '../dto/admin-campaigns-query.dto';
import {
  AdminCampaignResponseDto,
  AdminCampaignListResponseDto,
} from '../dto/admin-campaign-response.dto';
import { AdminDeleteResponseDto } from '../dto/admin-delete-response.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';

@ApiTags('Admin Campaigns')
@ApiBearerAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(private readonly adminCampaignsService: AdminCampaignsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Create a new campaign with optional image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Campaign created successfully',
    type: AdminCampaignResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Campaign with this code already exists or invalid date range',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file format or file too large',
  })
  async createCampaign(
    @Body() createCampaignDto: CreateCampaignDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<AdminCampaignResponseDto> {
    if (image) {
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'image/webp',
      ];
      if (!allowedMimeTypes.includes(image.mimetype)) {
        throw new BadRequestException(
          'Invalid file format. Only JPEG, PNG, JPG and WebP are allowed',
        );
      }

      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
      if (image.size > maxSizeInBytes) {
        throw new BadRequestException('File too large. Maximum size is 5MB');
      }
    }

    return this.adminCampaignsService.createCampaign(createCampaignDto, image);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns with pagination and search' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaigns retrieved successfully',
    type: AdminCampaignListResponseDto,
  })
  async getAllCampaigns(
    @Query() query: AdminCampaignsQueryDto,
  ): Promise<AdminCampaignListResponseDto> {
    return this.adminCampaignsService.getAllCampaigns(
      query.page,
      query.limit,
      query.search,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign details retrieved successfully',
    type: AdminCampaignResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  async getCampaignById(
    @Param('id') id: string,
  ): Promise<AdminCampaignResponseDto> {
    return this.adminCampaignsService.getCampaignById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign deleted successfully',
    type: AdminDeleteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  async deleteCampaign(
    @Param('id') id: string,
  ): Promise<AdminDeleteResponseDto> {
    const deletedCampaign = await this.adminCampaignsService.deleteCampaign(id);
    return {
      message: 'Campaign deleted successfully',
      deletedId: deletedCampaign._id.toString(),
    };
  }
}
