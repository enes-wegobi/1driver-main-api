import { Injectable, Logger } from '@nestjs/common';
import { DriverPenaltyRepository } from '../repositories/driver-penalty.repository';
import { TripDocument } from '../schemas/trip.schema';
import {
  UserPenaltyDocument,
  PenaltyType,
} from '../schemas/driver-penalty.schema';
import { UserType } from 'src/common/user-type.enum';

@Injectable()
export class DriverPenaltyService {
  private readonly logger = new Logger(DriverPenaltyService.name);

  constructor(
    private readonly driverPenaltyRepository: DriverPenaltyRepository,
  ) {}

  async createPenalty(
    userId: string,
    userType: UserType,
    trip: TripDocument,
    timeDifferenceMinutes: number,
  ): Promise<UserPenaltyDocument> {
    const penaltyType =
      userType === UserType.DRIVER
        ? PenaltyType.DRIVER_LATE_CANCELLATION
        : PenaltyType.CUSTOMER_LATE_CANCELLATION;

    const penaltyAmount = this.calculatePenaltyAmount(
      userType,
      timeDifferenceMinutes,
    );

    const penaltyData = {
      userId,
      userType,
      tripId: trip._id,
      penaltyType,
      penaltyAmount,
      actionAt: new Date(),
      referenceTime: trip.tripStartTime,
      timeDifferenceMinutes,
      isPaid: false,
    };

    this.logger.log(
      `Creating penalty for ${userType.toLowerCase()} ${userId}: ${penaltyAmount} AED for ${timeDifferenceMinutes} minutes late cancellation`,
    );

    return this.driverPenaltyRepository.create(penaltyData);
  }

  async getUserPenalties(
    userId: string,
    userType?: UserType,
  ): Promise<UserPenaltyDocument[]> {
    return this.driverPenaltyRepository.findByUserId(userId, userType);
  }

  async getDriverPenalties(driverId: string): Promise<UserPenaltyDocument[]> {
    return this.driverPenaltyRepository.findByDriverId(driverId);
  }

  async getCustomerPenalties(
    customerId: string,
  ): Promise<UserPenaltyDocument[]> {
    return this.driverPenaltyRepository.findByCustomerId(customerId);
  }

  async getUnpaidPenalties(
    userId: string,
    userType?: UserType,
  ): Promise<UserPenaltyDocument[]> {
    return this.driverPenaltyRepository.findUnpaidPenalties(userId, userType);
  }

  async markPenaltyAsPaid(
    penaltyId: string,
  ): Promise<UserPenaltyDocument | null> {
    return this.driverPenaltyRepository.markAsPaid(penaltyId);
  }

  calculateTimeDifference(tripStartTime: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - tripStartTime.getTime();
    return Math.floor(diffMs / (1000 * 60)); // Convert to minutes
  }

  shouldApplyPenalty(timeDifferenceMinutes: number): boolean {
    return timeDifferenceMinutes > 5;
  }

  private calculatePenaltyAmount(
    userType: UserType,
    timeDifferenceMinutes: number,
  ): number {
    if (userType === UserType.DRIVER) {
      // Driver cancellations have no penalty amount
      return 0;
    }

    if (userType === UserType.CUSTOMER) {
      // Customer penalty: 5 AED per minute after 5 minutes
      const penaltyMinutes = Math.max(0, timeDifferenceMinutes - 5);
      return penaltyMinutes * 5; // 5 AED per minute
    }

    return 0;
  }
}
