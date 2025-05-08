import { Injectable, Logger } from '@nestjs/common';
import { AxiosInstance } from 'axios';
import { ClientsService } from '../clients.service';
import { PromotionResponseDto } from './dto/promotion-response.dto';
import { CreatePromotionDto } from 'src/modules/promotions/dto/create-promotion.dto';

@Injectable()
export class PromotionClient {
  private readonly logger = new Logger(PromotionClient.name);
  private readonly httpClient: AxiosInstance;

  constructor(private readonly clientsService: ClientsService) {
    this.httpClient = this.clientsService.createHttpClient('promotion');
  }

  async findBySegment(segment: string): Promise<PromotionResponseDto[]> {
    this.logger.log(`Finding promotions for segment: ${segment}`);
    const { data } = await this.httpClient.get(`/promotions/segments/${segment}`);
    return data;
  }

  async findBySegments(segments: string[]): Promise<PromotionResponseDto[]> {
    this.logger.log(`Finding promotions for segments: ${segments.join(', ')}`);
    const { data } = await this.httpClient.post('/promotions/segments', { segments });
    return data;
  }

  async findByCode(code: string): Promise<PromotionResponseDto> {
    this.logger.log(`Finding promotion by code: ${code}`);
    const { data } = await this.httpClient.get(`/promotions/code/${code}`);
    return data;
  }

  async findById(id: string): Promise<PromotionResponseDto> {
    this.logger.log(`Finding promotion by ID: ${id}`);
    const { data } = await this.httpClient.get(`/promotions/${id}`);
    return data;
  }

  async isUserEligibleForPromotion(
    userId: string,
    promotionId: string,
    segments: string[],
  ): Promise<boolean> {
    this.logger.log(`Checking if user ${userId} is eligible for promotion ${promotionId}`);
    const segmentsParam = segments.join(',');
    const { data } = await this.httpClient.get(
      `/promotions/user/${userId}/eligible/${promotionId}?segments=${segmentsParam}`,
    );
    return data.eligible;
  }

  async usePromotion(id: string): Promise<PromotionResponseDto> {
    this.logger.log(`Using promotion with ID: ${id}`);
    const { data } = await this.httpClient.post(`/promotions/${id}/use`);
    return data;
  }

  async createPromotion(createPromotionDto: CreatePromotionDto): Promise<PromotionResponseDto> {
    this.logger.log(`Creating new promotion: ${createPromotionDto.name}`);
    const { data } = await this.httpClient.post('/promotions', createPromotionDto);
    return data;
  }
}
