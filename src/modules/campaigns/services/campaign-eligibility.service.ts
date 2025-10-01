import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { TripService } from '../../trip/services/trip.service';
import { CampaignTargetGroup } from '../enums';

export interface UserEligibilityData {
  completedTripsCount: number;
  lastCompletedTripDate: Date | null;
}

@Injectable()
export class CampaignEligibilityService {
  constructor(
    @Inject(forwardRef(() => TripService))
    private readonly tripService: TripService,
  ) {}

  async getUserEligibilityData(
    userId: string,
  ): Promise<UserEligibilityData> {
    const [completedTripsCount, lastCompletedTripDate] = await Promise.all([
      this.tripService.getCompletedTripsCount(userId),
      this.tripService.getLastCompletedTripDate(userId),
    ]);

    return { completedTripsCount, lastCompletedTripDate };
  }

  isUserEligibleForTargetGroup(
    targetGroup: CampaignTargetGroup,
    eligibilityData: UserEligibilityData,
  ): boolean {
    switch (targetGroup) {
      case CampaignTargetGroup.FIRST_TIME_USERS:
        return this.isFirstTimeUser(eligibilityData);

      case CampaignTargetGroup.INACTIVE_USERS:
        return this.isInactiveUser(eligibilityData);

      default:
        return false;
    }
  }

  private isFirstTimeUser(eligibilityData: UserEligibilityData): boolean {
    return eligibilityData.completedTripsCount === 0;
  }

  private isInactiveUser(eligibilityData: UserEligibilityData): boolean {
    if (!eligibilityData.lastCompletedTripDate) {
      return false;
    }

    const daysSinceLastTrip = Math.floor(
      (Date.now() - eligibilityData.lastCompletedTripDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return daysSinceLastTrip >= 30;
  }
}
