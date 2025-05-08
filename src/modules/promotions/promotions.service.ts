import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CustomersClient } from 'src/clients/customer/customers.client';
import { PromotionClient } from 'src/clients/promotion/promotion.client';

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly customersClient: CustomersClient,
    private readonly promotionClient: PromotionClient,
  ) {}

  async getCustomerPromotions(customerId: string): Promise<any> {
    this.logger.log(`Fetching customer data for ID: ${customerId}`);
    const customer = await this.customersClient.findOne(customerId);
    
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    const segments = customer.segments || [];

    this.logger.log(`Customer segments: ${segments.join(', ')}`);

    let promotions: any[] = [];
    
    try {
      promotions = await this.promotionClient.findBySegments(segments);
      this.logger.log(`Found ${promotions.length} promotions for segments: ${segments.join(', ')}`);
    } catch (error) {
      this.logger.error(`Error fetching promotions for segments: ${error.message}`);
    }
    
    return {
      customerId,
      segments,
      promotions,
    };
  }
}
