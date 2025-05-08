import {
  Controller,
  Get,
  Logger,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/jwt/jwt.guard';
import { GetUser } from 'src/jwt/user.decoretor';
import { IJwtPayload } from 'src/jwt/jwt-payload.interface';
import { PromotionsService } from './promotions.service';

@ApiTags('promotions')
@ApiBearerAuth()
@Controller('promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  private readonly logger = new Logger(PromotionsController.name);

  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('me')
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
      this.logger.log(`Getting promotions for customer ID: ${user.userId}`);
      return await this.promotionsService.getCustomerPromotions(user.userId);
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
}
