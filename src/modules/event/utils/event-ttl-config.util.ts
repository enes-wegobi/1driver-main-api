import { EventType } from '../enum/event-type.enum';

export interface TTLConfig {
  intervals: number[]; // TTL intervals in seconds for each retry
  maxRetries: number;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
}

export class EventTTLConfigUtil {
  private static readonly TTL_CONFIGS: Record<EventType, TTLConfig> = {
    // CRITICAL Events - Ultra fast retry (3s, 10s, 30s)
    [EventType.TRIP_DRIVER_ASSIGNED]: {
      intervals: [3, 10, 30],
      maxRetries: 3,
      priority: 'CRITICAL',
    },
    [EventType.TRIP_DRIVER_ARRIVED]: {
      intervals: [3, 10, 30],
      maxRetries: 3,
      priority: 'CRITICAL',
    },
    [EventType.TRIP_STARTED]: {
      intervals: [3, 10, 30],
      maxRetries: 3,
      priority: 'CRITICAL',
    },
    [EventType.TRIP_CANCELLED]: {
      intervals: [3, 10, 30],
      maxRetries: 3,
      priority: 'CRITICAL',
    },
    [EventType.TRIP_COMPLETED]: {
      intervals: [5, 15, 45],
      maxRetries: 3,
      priority: 'CRITICAL',
    },

    // PAYMENT Events - Critical but slightly more tolerant
    [EventType.TRIP_PAYMENT_REQUIRED]: {
      intervals: [5, 15, 45],
      maxRetries: 3,
      priority: 'CRITICAL',
    },
    [EventType.TRIP_PAYMENT_SUCCESS]: {
      intervals: [5, 15, 45],
      maxRetries: 3,
      priority: 'CRITICAL',
    },
    [EventType.TRIP_PAYMENT_FAILED]: {
      intervals: [5, 15, 45],
      maxRetries: 3,
      priority: 'CRITICAL',
    },

    // HIGH Priority Events - Fast retry (10s, 30s, 60s)
    [EventType.TRIP_DRIVER_EN_ROUTE]: {
      intervals: [10, 30, 60],
      maxRetries: 3,
      priority: 'HIGH',
    },
    [EventType.TRIP_DRIVER_NOT_FOUND]: {
      intervals: [15, 45, 90],
      maxRetries: 3,
      priority: 'HIGH',
    },
    [EventType.TRIP_PAYMENT_STARTED]: {
      intervals: [10, 30, 60],
      maxRetries: 3,
      priority: 'HIGH',
    },
    [EventType.TRIP_PAYMENT_PROCESSING]: {
      intervals: [10, 30, 60],
      maxRetries: 3,
      priority: 'HIGH',
    },

    // NORMAL Events - Standard retry (30s, 60s, 120s)
    [EventType.DRIVER_LOCATION_UPDATED]: {
      intervals: [30, 60, 120],
      maxRetries: 2, // Location updates are less critical
      priority: 'NORMAL',
    },
    [EventType.DRIVER_STATUS_CHANGED]: {
      intervals: [30, 60, 120],
      maxRetries: 3,
      priority: 'NORMAL',
    },
    [EventType.CUSTOMER_LOCATION_UPDATED]: {
      intervals: [30, 60, 120],
      maxRetries: 2,
      priority: 'NORMAL',
    },

    // System Events - Low priority
    [EventType.NOTIFICATION]: {
      intervals: [60, 120, 300],
      maxRetries: 2,
      priority: 'NORMAL',
    },
    [EventType.ERROR]: {
      intervals: [30, 60, 120],
      maxRetries: 3,
      priority: 'NORMAL',
    },

    // Less critical trip events
    [EventType.TRIP_REQUESTED]: {
      intervals: [30, 60, 120],
      maxRetries: 3,
      priority: 'NORMAL',
    },
    [EventType.TRIP_ALREADY_TAKEN]: {
      intervals: [10, 30, 60],
      maxRetries: 3,
      priority: 'HIGH',
    },
    [EventType.TRIP_REJECTED]: {
      intervals: [15, 45, 90],
      maxRetries: 3,
      priority: 'HIGH',
    },
    [EventType.TRIP_PAYMENT_RETRY]: {
      intervals: [10, 30, 60],
      maxRetries: 3,
      priority: 'HIGH',
    },
  };

  /**
   * Get TTL for specific event type and retry count
   */
  static getTTL(eventType: EventType, retryCount: number): number {
    const config = EventTTLConfigUtil.TTL_CONFIGS[eventType];
    if (!config) {
      // Default configuration for unknown event types
      return [30, 60, 120][retryCount] || 120;
    }

    return (
      config.intervals[retryCount] ||
      config.intervals[config.intervals.length - 1]
    );
  }

  /**
   * Get max retries for event type
   */
  static getMaxRetries(eventType: EventType): number {
    const config = EventTTLConfigUtil.TTL_CONFIGS[eventType];
    return config?.maxRetries || 3;
  }

  /**
   * Check if event is critical (requires aggressive retry)
   */
  static isCritical(eventType: EventType): boolean {
    const config = EventTTLConfigUtil.TTL_CONFIGS[eventType];
    return config?.priority === 'CRITICAL';
  }

  /**
   * Check if event is high priority
   */
  static isHighPriority(eventType: EventType): boolean {
    const config = EventTTLConfigUtil.TTL_CONFIGS[eventType];
    return config?.priority === 'HIGH';
  }

  /**
   * Get event priority
   */
  static getPriority(eventType: EventType): 'CRITICAL' | 'HIGH' | 'NORMAL' {
    const config = EventTTLConfigUtil.TTL_CONFIGS[eventType];
    return config?.priority || 'NORMAL';
  }

  /**
   * Get full configuration for event type
   */
  static getConfig(eventType: EventType): TTLConfig {
    return (
      EventTTLConfigUtil.TTL_CONFIGS[eventType] || {
        intervals: [30, 60, 120],
        maxRetries: 3,
        priority: 'NORMAL',
      }
    );
  }

  /**
   * Get all critical event types
   */
  static getCriticalEventTypes(): EventType[] {
    return Object.entries(EventTTLConfigUtil.TTL_CONFIGS)
      .filter(([, config]) => config.priority === 'CRITICAL')
      .map(([eventType]) => eventType as EventType);
  }

  /**
   * Get statistics about TTL configurations
   */
  static getConfigStats(): {
    critical: number;
    high: number;
    normal: number;
    totalEvents: number;
  } {
    const configs = Object.values(EventTTLConfigUtil.TTL_CONFIGS);
    return {
      critical: configs.filter((c) => c.priority === 'CRITICAL').length,
      high: configs.filter((c) => c.priority === 'HIGH').length,
      normal: configs.filter((c) => c.priority === 'NORMAL').length,
      totalEvents: configs.length,
    };
  }
}
