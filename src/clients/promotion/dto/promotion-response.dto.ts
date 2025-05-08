export class PromotionResponseDto {
  id: string;
  name: string;
  description: string;
  code: string;
  promotionType: string;
  value: number;
  userSegment: string;
  startDate: Date;
  endDate: Date;
  photoKey?: string;
  status: string;
  usageLimit: number;
  usageCount: number;
  userUsageLimit: number;
}
