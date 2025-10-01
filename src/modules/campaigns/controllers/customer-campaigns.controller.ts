import {
  Controller,
  Get,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CampaignsService } from '../services/campaigns.service';
import { JwtAuthGuard } from 'src/jwt/guards/jwt.guard';
import { GetUser } from 'src/jwt/user.decorator';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';

@ApiTags('Customer Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campaigns')
export class CustomerCampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('eligible')
  @ApiOperation({
    summary: 'Get all eligible campaigns for the authenticated customer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Eligible campaigns retrieved successfully',
  })
  async getEligibleCampaigns(@GetUser() user: IJwtPayload) {
    return this.campaignsService.findEligibleCampaignsForUser(user.userId);
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
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Campaign not found',
  })
  async getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignDetailsForUser(id);
  }
}
