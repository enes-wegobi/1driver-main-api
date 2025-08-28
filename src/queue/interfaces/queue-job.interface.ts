export interface TripRequestJob {
  tripId: string;
  driverId: string;
  priority: number;
  customerLocation: {
    lat: number;
    lon: number;
  };
  tripData: {
    customerId: string;
    estimatedDistance?: number;
    estimatedDuration?: number;
    estimatedCost?: number;
    route?: Array<{
      lat: number;
      lon: number;
      address?: string;
    }>;
  };
  retryCount?: number;
  originalDriverIds?: string[];
}

export interface TripTimeoutJob {
  tripId: string;
  driverId: string;
  timeoutType: 'driver_response' | 'pickup_arrival' | 'trip_completion';
  scheduledAt: Date;
  metadata?: {
    customerLocation?: {
      lat: number;
      lon: number;
    };
    originalDriverIds?: string[];
    retryCount?: number;
  };
}

export interface QueueJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface JobResult {
  success: boolean;
  message?: string;
  data?: any;
  shouldRetry?: boolean;
  nextAction?: 'timeout' | 'next_driver' | 'complete';
}
