# Orphaned Jobs Handling - Bull Queue Strategy

## 🚨 Problem Scenario

**Durum**: Trip request 2 driver'a gönderildi, hiçbiri kabul etmedi veya timeout oldu. Bu job'lar driver'ların queue'sunda kalıyor ve yeni request geldiğinde bunları alabilirler.

## 🔍 Current System Analysis

### Mevcut Redis Queue Sistemi
```typescript
// Mevcut sistemde:
driver:request_queue:${driverId} = sorted set with tripId
trip:queued_drivers:${tripId} = set of driverIds

// Problem: Trip cancel/timeout olduğunda cleanup eksik
```

## 🎯 Bull Queue Solution

### 1. Job Lifecycle Management

```typescript
interface TripRequestJob {
  tripId: string;
  driverId: string;
  customerId: string;
  tripData: any;
  metadata: {
    createdAt: Date;
    expiresAt: Date;
    status: 'PENDING' | 'PROCESSING' | 'EXPIRED' | 'COMPLETED';
  };
}
```

### 2. Automatic Job Cleanup Strategy

#### A. TTL-based Cleanup
```typescript
// Job creation with TTL
await tripQueue.add('process-trip-request', jobData, {
  delay: 0,
  ttl: 300000, // 5 minutes TTL
  removeOnComplete: 10,
  removeOnFail: 5,
});
```

#### B. Trip Status Validation
```typescript
@Process('process-trip-request')
async handleTripRequest(job: Job<TripRequestJob>) {
  const { tripId, driverId } = job.data;
  
  // 1. Check if trip still exists and is PENDING
  const trip = await this.tripService.findById(tripId);
  if (!trip || trip.status !== 'PENDING') {
    this.logger.warn(`Trip ${tripId} is no longer valid, skipping job`);
    return; // Job completes without processing
  }
  
  // 2. Check if driver is still available
  const isAvailable = await this.driverService.isAvailable(driverId);
  if (!isAvailable) {
    this.logger.warn(`Driver ${driverId} is no longer available`);
    throw new Error('Driver not available'); // Will retry or fail
  }
  
  // 3. Process the request
  await this.processRequest(tripId, driverId);
}
```

#### C. Global Cleanup Service
```typescript
@Injectable()
export class OrphanedJobCleanupService {
  
  @Cron('*/2 * * * *') // Every 2 minutes
  async cleanupOrphanedJobs() {
    const queues = ['trip-requests', 'trip-timeouts'];
    
    for (const queueName of queues) {
      await this.cleanupQueueJobs(queueName);
    }
  }
  
  private async cleanupQueueJobs(queueName: string) {
    const queue = this.getQueue(queueName);
    const jobs = await queue.getJobs(['waiting', 'delayed']);
    
    for (const job of jobs) {
      const { tripId } = job.data;
      
      // Check if trip is still valid
      const trip = await this.tripService.findById(tripId);
      if (!trip || trip.status !== 'PENDING') {
        await job.remove();
        this.logger.debug(`Removed orphaned job for trip ${tripId}`);
      }
    }
  }
}
```

### 3. Trip Cancellation Handler

```typescript
@Injectable()
export class TripCancellationService {
  
  async cancelTrip(tripId: string, reason: string) {
    // 1. Update trip status
    await this.tripService.updateStatus(tripId, 'CANCELLED');
    
    // 2. Remove all related jobs from all queues
    await this.removeAllJobsForTrip(tripId);
    
    // 3. Notify drivers
    await this.notifyDriversOfCancellation(tripId);
  }
  
  private async removeAllJobsForTrip(tripId: string) {
    const queues = ['trip-requests', 'trip-timeouts'];
    
    for (const queueName of queues) {
      const queue = this.getQueue(queueName);
      const jobs = await queue.getJobs(['waiting', 'delayed', 'active']);
      
      const jobsToRemove = jobs.filter(job => 
        job.data.tripId === tripId
      );
      
      await Promise.all(jobsToRemove.map(job => job.remove()));
    }
  }
}
```

### 4. Driver Queue Isolation

```typescript
// Her driver için ayrı queue yerine, job-level filtering
@Process('process-trip-request')
async handleTripRequest(job: Job<TripRequestJob>) {
  const { tripId, driverId } = job.data;
  
  // Check if driver already has an active trip
  const hasActiveTrip = await this.driverService.hasActiveTrip(driverId);
  if (hasActiveTrip) {
    // Delay the job for later processing
    await job.moveToDelayed(Date.now() + 60000); // 1 minute delay
    return;
  }
  
  // Process normally
  await this.processRequest(tripId, driverId);
}
```

## 🔧 Implementation Plan

### Task 6: Orphaned Jobs Handling (1 hour)

#### 6.1 Add Job Validation
- [ ] Trip status validation in processors
- [ ] Driver availability check
- [ ] Job TTL configuration

#### 6.2 Create Cleanup Service
- [ ] `OrphanedJobCleanupService` with cron job
- [ ] Global job removal methods
- [ ] Logging and monitoring

#### 6.3 Trip Cancellation Integration
- [ ] `TripCancellationService` 
- [ ] Remove jobs on trip cancel/timeout
- [ ] Driver notification cleanup

#### 6.4 Testing Scenarios
- [ ] Test expired trip job cleanup
- [ ] Test driver unavailable scenarios
- [ ] Test concurrent job processing
- [ ] Test queue isolation

## 📊 Monitoring & Metrics

### Key Metrics to Track
```typescript
interface OrphanedJobMetrics {
  totalOrphanedJobs: number;
  cleanupFrequency: number;
  avgJobLifetime: number;
  failedCleanups: number;
}
```

### Dashboard Alerts
- Jobs older than 10 minutes
- High orphaned job count
- Cleanup service failures

## 🎯 Benefits

### Compared to Current System
- ✅ **Automatic Cleanup**: TTL + cron job cleanup
- ✅ **Job Validation**: Real-time trip status check
- ✅ **Memory Efficiency**: Automatic job removal
- ✅ **Queue Isolation**: No cross-contamination
- ✅ **Monitoring**: Built-in metrics and alerts

### Prevention Strategy
1. **TTL-based expiration**: Jobs auto-expire
2. **Status validation**: Check trip validity before processing
3. **Periodic cleanup**: Cron job removes orphaned jobs
4. **Event-driven cleanup**: Trip cancellation triggers job removal

Bu yaklaşım ile orphaned job problemi tamamen çözülecek! 🚀
