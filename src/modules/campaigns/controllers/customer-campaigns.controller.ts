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
import { EligibleCampaignDto } from '../dto/eligible-campaigns-response.dto';

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
    type: [EligibleCampaignDto],
  })
  async getEligibleCampaigns(
    @GetUser() user: IJwtPayload,
  ): Promise<EligibleCampaignDto[]> {
    return this.campaignsService.findEligibleCampaignsForUser(user.userId);
  }
}
