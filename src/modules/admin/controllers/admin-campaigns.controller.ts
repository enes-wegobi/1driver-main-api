import {
  Controller,
  Get,
  Post,
  Patch,
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
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { AdminCampaignsService } from '../services/admin-campaigns.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { AdminCampaignsQueryDto } from '../dto/admin-campaigns-query.dto';
import {
  AdminCampaignResponseDto,
  AdminCampaignListResponseDto,
} from '../dto/admin-campaign-response.dto';
import { AdminDeleteResponseDto } from '../dto/admin-delete-response.dto';
import { CampaignTypesResponseDto } from '../dto/campaign-types-response.dto';
import { CampaignTargetGroupsResponseDto } from '../dto/campaign-target-groups-response.dto';
import { AdminAuthGuard } from '../guards/admin-auth.guard';
import { IdParamDto } from '../dto/id-param.dto';

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
    description: 'Invalid file format or file too large (max 15MB)',
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

      const maxSizeInBytes = 15 * 1024 * 1024; // 15MB
      if (image.size > maxSizeInBytes) {
        throw new BadRequestException('File too large. Maximum size is 15MB');
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
  @ApiParam({
    name: 'id',
    description: 'Campaign ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign details retrieved successfully',
    type: AdminCampaignResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid campaign ID format',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  async getCampaignById(
    @Param() params: IdParamDto,
  ): Promise<AdminCampaignResponseDto> {
    return this.adminCampaignsService.getCampaignById(params.id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Update campaign by ID with optional image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'Campaign ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign updated successfully',
    type: AdminCampaignResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid campaign ID format or invalid file format/size',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Campaign code already exists or invalid date range',
  })
  async updateCampaign(
    @Param() params: IdParamDto,
    @Body() updateCampaignDto: UpdateCampaignDto,
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

      const maxSizeInBytes = 15 * 1024 * 1024;
      if (image.size > maxSizeInBytes) {
        throw new BadRequestException('File too large. Maximum size is 15MB');
      }
    }

    return this.adminCampaignsService.updateCampaign(
      params.id,
      updateCampaignDto,
      image,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign by ID' })
  @ApiParam({
    name: 'id',
    description: 'Campaign ID (MongoDB ObjectId)',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign deleted successfully',
    type: AdminDeleteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid campaign ID format',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  async deleteCampaign(
    @Param() params: IdParamDto,
  ): Promise<AdminDeleteResponseDto> {
    const deletedCampaign = await this.adminCampaignsService.deleteCampaign(params.id);
    return {
      message: 'Campaign deleted successfully',
      deletedId: deletedCampaign._id.toString(),
    };
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all available campaign types' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign types retrieved successfully',
    type: CampaignTypesResponseDto,
  })
  getCampaignTypes(): CampaignTypesResponseDto {
    return {
      types: this.adminCampaignsService.getCampaignTypes(),
    };
  }

  @Get('target-groups')
  @ApiOperation({ summary: 'Get all available campaign target groups' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Campaign target groups retrieved successfully',
    type: CampaignTargetGroupsResponseDto,
  })
  getCampaignTargetGroups(): CampaignTargetGroupsResponseDto {
    return {
      targetGroups: this.adminCampaignsService.getCampaignTargetGroups(),
    };
  }
}
