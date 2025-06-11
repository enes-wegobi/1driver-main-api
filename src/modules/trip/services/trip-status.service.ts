import { Injectable, Logger } from '@nestjs/common';
import { TripStatus } from 'src/common/enums/trip-status.enum';
import { TripErrors } from '../exceptions/trip-errors';

interface StatusTransition {
  to: TripStatus[];
  validate?: (
    currentStatus: TripStatus,
    newStatus: TripStatus,
  ) => { valid: boolean; message?: string };
}

@Injectable()
export class TripStatusService {
  private readonly logger = new Logger(TripStatusService.name);
  private readonly statusTransitions: Record<TripStatus, StatusTransition> = {
    [TripStatus.DRAFT]: {
      to: [TripStatus.WAITING_FOR_DRIVER, TripStatus.CANCELLED],
    },
    [TripStatus.WAITING_FOR_DRIVER]: {
      to: [
        TripStatus.DRIVER_NOT_FOUND,
        TripStatus.APPROVED,
        TripStatus.CANCELLED,
      ],
    },
    [TripStatus.DRIVER_NOT_FOUND]: {
      to: [TripStatus.WAITING_FOR_DRIVER, TripStatus.CANCELLED],
    },
    [TripStatus.APPROVED]: {
      to: [TripStatus.DRIVER_ON_WAY_TO_PICKUP, TripStatus.CANCELLED],
    },
    [TripStatus.DRIVER_ON_WAY_TO_PICKUP]: {
      to: [TripStatus.ARRIVED_AT_PICKUP, TripStatus.CANCELLED],
    },
    [TripStatus.ARRIVED_AT_PICKUP]: {
      to: [TripStatus.TRIP_IN_PROGRESS, TripStatus.CANCELLED],
    },
    [TripStatus.TRIP_IN_PROGRESS]: {
      to: [TripStatus.PAYMENT, TripStatus.CANCELLED],
    },
    [TripStatus.PAYMENT]: {
      to: [TripStatus.COMPLETED, TripStatus.CANCELLED],
    },
    [TripStatus.COMPLETED]: {
      to: [],
    },
    [TripStatus.CANCELLED_PAYMENT]: {
      to: [TripStatus.CANCELLED],
    },
    [TripStatus.CANCELLED]: {
      to: [],
    },
  };

  /**
   * Check if a status transition is valid
   * @param currentStatus Current trip status
   * @param newStatus New trip status
   * @returns Object with valid flag and optional message
   */
  canTransition(
    currentStatus: TripStatus,
    newStatus: TripStatus,
  ): { valid: boolean; message?: string } {
    // If current and new status are the same, it's valid
    if (currentStatus === newStatus) {
      return { valid: true };
    }

    const transition = this.statusTransitions[currentStatus];
    if (!transition) {
      return {
        valid: false,
        message: `Invalid current status: ${currentStatus}`,
      };
    }

    // Check if the new status is in the allowed transitions
    if (!transition.to.includes(newStatus)) {
      return {
        valid: false,
        message: `Cannot transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${transition.to.join(', ')}`,
      };
    }

    // If there's a custom validation function, use it
    if (transition.validate) {
      return transition.validate(currentStatus, newStatus);
    }

    return { valid: true };
  }

  /**
   * Validate if a trip can be in a specific status for an operation
   * @param currentStatus Current trip status
   * @param requiredStatus Required status for the operation
   * @returns Object with valid flag and optional message
   */
  validateStatus(
    currentStatus: TripStatus,
    requiredStatus: TripStatus,
  ): { valid: boolean; message?: string } {
    if (currentStatus !== requiredStatus) {
      return {
        valid: false,
        message: TripErrors.TRIP_INVALID_STATUS.message,
      };
    }
    return { valid: true };
  }

  /**
   * Validate if a trip can be in one of multiple statuses for an operation
   * @param currentStatus Current trip status
   * @param requiredStatuses Array of required statuses for the operation
   * @returns Object with valid flag and optional message
   */
  validateMultipleStatuses(
    currentStatus: TripStatus,
    requiredStatuses: TripStatus[],
  ): { valid: boolean; message?: string } {
    if (!requiredStatuses.includes(currentStatus)) {
      return {
        valid: false,
        message: TripErrors.TRIP_INVALID_STATUS.message,
      };
    }
    return { valid: true };
  }
}
