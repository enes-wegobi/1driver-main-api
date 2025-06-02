export class QueueOverviewDto {
  totalActiveDrivers: number;
  totalQueuedRequests: number;
  totalCurrentRequests: number;
  averageQueueLength: number;
  systemLoad: 'low' | 'medium' | 'high';
  driversWithQueues: number;
  longestQueueLength: number;
  oldestQueuedRequest: number | null;
}

export class QueuedRequestDetailDto {
  tripId: string;
  priority: number;
  queuedAt: Date;
  waitingTime: number;
  score: number;
}

export class DetailedDriverQueueDto {
  driverId: string;
  currentRequest: string | null;
  queueLength: number;
  queuedRequests: QueuedRequestDetailDto[];
  lastActivity: Date | null;
  isActive: boolean;
}

export class TripQueueStatusDto {
  tripId: string;
  queuedInDrivers: string[];
  totalDriversQueued: number;
  averagePosition: number;
  oldestQueueTime: Date | null;
}

export class QueuePerformanceMetricsDto {
  totalQueues: number;
  totalRequests: number;
  averageWaitTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  memoryUsage: {
    queueKeys: number;
    currentRequestKeys: number;
    tripQueueKeys: number;
  };
}

export class QueueHealthCheckDto {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  timestamp: Date;
}

export class RealtimeQueueStatsDto {
  overview: QueueOverviewDto;
  metrics: QueuePerformanceMetricsDto;
  topQueues: DetailedDriverQueueDto[];
  recentActivity: Array<{
    type: 'queue_add' | 'queue_remove' | 'current_request';
    driverId: string;
    tripId: string;
    timestamp: Date;
  }>;
}
