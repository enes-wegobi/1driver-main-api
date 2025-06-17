import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { PromotionClient } from 'src/clients/promotion/promotion.client';
import { PromotionResponseDto } from 'src/clients/promotion/dto/promotion-response.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { LoggerService } from 'src/logger/logger.service';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly customersClient: CustomersClient,
    private readonly promotionClient: PromotionClient,
    private readonly logger: LoggerService,
  ) {}

  async getCustomerPromotions(customerId: string): Promise<any> {
    this.logger.info(`Fetching customer data for ID: ${customerId}`);
    const customer = await this.customersClient.findOne(customerId);

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const segments = customer.segments || [];

    this.logger.info(`Customer segments: ${segments.join(', ')}`);

    let promotions: any[] = [];

    try {
      promotions = await this.promotionClient.findBySegments(segments);
      this.logger.info(
        `Found ${promotions.length} promotions for segments: ${segments.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        `Error fetching promotions for segments: ${error.message}`,
      );
    }

    return {
      customerId,
      segments,
      promotions,
    };
  }

  async getAllPromotions(): Promise<PromotionResponseDto[]> {
    this.logger.info('Fetching all promotions');
    try {
      // Since there's no direct method to get all promotions, we'll use the segments endpoint
      // with 'all_users' segment which should return all promotions
      const promotions = await this.promotionClient.findBySegments([
        'all_users',
      ]);
      this.logger.info(`Found ${promotions.length} promotions`);
      return promotions;
    } catch (error) {
      this.logger.error(
        `Error fetching all promotions: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async createPromotion(createPromotionDto: CreatePromotionDto): Promise<any> {
    this.logger.info(`Creating new promotion: ${createPromotionDto.name}`);

    try {
      const promotion =
        await this.promotionClient.createPromotion(createPromotionDto);
      this.logger.info(
        `Promotion created successfully with ID: ${promotion.id}`,
      );
      return promotion;
    } catch (error) {
      this.logger.error(
        `Error creating promotion: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
