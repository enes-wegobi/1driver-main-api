# Customer Trip Request Processing System - Detailed Documentation

## 📋 Overview

This documentation provides a comprehensive analysis of how a customer trip request is processed in the 1Driver system, from the initial request through driver assignment and Redis storage. This documentation focuses solely on the request processing flow and does not include trip acceptance/rejection aftermath.

## 🔄 Trip Request Flow Diagram

```
Customer Request
       ↓
1. POST /customer-trips/request-driver
       ↓
2. Validation Process
   - Payment method validation
   - Active trip validation
       ↓
3. Driver Search
   - Geographic search (20km → 25km → 50km)
   - Find available drivers
       ↓
4. Database Operations
   - Update trip status (WAITING_FOR_DRIVER)
   - Record called driver IDs
       ↓
5. Redis Operations
   - Active trip assignment
   - Add trip to driver queues
       ↓
6. Queue Processing
   - Sequential driver queue system
   - Priority-based assignment
       ↓
7. WebSocket Notifications
   - Real-time notifications to drivers
```

## 🎯 1. Customer Trip Request Initiation

### Endpoint: `POST /customer-trips/request-driver`

**File:** `src/modules/trip/controllers/customer-trip.controller.ts:97`

```typescript
@Post('request-driver')
async requestDriver(
  @Body() requestDriverDto: RequestDriverDto,
  @GetUser() user: IJwtPayload,
) {
  return await this.tripService.requestDriver(
    user.userId,
    requestDriverDto.tripId,
  );
}
```

### Main Method: `TripService.requestDriver()`

**File:** `src/modules/trip/services/trip.service.ts:138`

```typescript
async requestDriver(customerId: string, tripId?: string): Promise<any> {
  return this.lockService.executeWithLock(
    `trip:${tripId}`,
    async () => {
      // Thread-safe operation with lock mechanism
      return this.executeWithErrorHandling('requesting driver', async () => {
        // Validation and processing
      });
    },
    'Trip is currently being processed by another request. Please try again.',
    45000, // 45 seconds timeout
    2,     // 2 retries
  );
}
```

## ✅ 2. Validation Process

### Payment Method Validation

**Method:** `validateCustomerHasPaymentMethod()`
**File:** `src/modules/trip/services/trip.service.ts:1295`

```typescript
private async validateCustomerHasPaymentMethod(customerId: string): Promise<void> {
  const defaultPaymentMethod = await this.paymentMethodService.getDefaultPaymentMethod(customerId);
  
  if (!defaultPaymentMethod) {
    throw new RedisException(
      RedisErrors.PAYMENT_NOT_FOUND.code,
      RedisErrors.PAYMENT_NOT_FOUND.message,
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

### Active Trip Validation

The system validates if the customer already has an active trip:

```typescript
if (tripId) {
  trip = await this.findAndValidateRequestTrip(customerId, tripId);
} else {
  const result = await this.getUserActiveTrip(customerId, UserType.CUSTOMER);
  trip = result.trip;
  if (trip.status !== TripStatus.DRIVER_NOT_FOUND) {
    throw new BadRequestException('trip not available status');
  }
}
```

## 🔍 3. Driver Search and Selection Process

### Geographic Search

**Method:** `searchDriver()`
**File:** `src/modules/trip/services/trip.service.ts:901`

```typescript
private async searchDriver(lat: number, lon: number): Promise<string[]> {
  const searchRadii = [20, 25, 50]; // in kilometers
  let drivers: FindNearbyUsersResult = [];

  for (const radius of searchRadii) {
    drivers = await this.nearbySearchService.findNearbyAvailableDrivers(
      lat,
      lon,
      radius,
    );

    if (drivers.length > 0) {
      break; // Stop at first radius with results
    }
  }

  if (drivers.length === 0) {
    throw new RedisException(
      RedisErrors.NO_DRIVERS_FOUND.code,
      RedisErrors.NO_DRIVERS_FOUND.message,
    );
  }

  return drivers.map((driver) => driver.userId);
}
```

### Redis Geo Index Usage

The system retrieves driver locations from Redis geo spatial index:

**Redis Key:** `location:driver:geo`

This key stores geographic positions of drivers and uses `GEORADIUS` command to find nearby drivers.

## 🗄️ 4. Database Operations

### Trip Status Update

```typescript
const updateData = this.buildDriverRequestUpdateData(
  driverIds,
  trip.callRetryCount,
);

const updatedTrip = await this.updateTripWithData(trip._id, updateData);
```

**Update Data Structure:**
```typescript
private buildDriverRequestUpdateData(
  driverIds: string[],
  currentRetryCount: number,
): UpdateTripDto {
  return {
    status: TripStatus.WAITING_FOR_DRIVER,
    calledDriverIds: driverIds,        // Called drivers
    rejectedDriverIds: [],             // Empty initially
    callStartTime: new Date(),         // Search start time
    callRetryCount: (currentRetryCount || 0) + 1,
  };
}
```

## 🔴 5. Redis Trip and Driver Queue Records

### Active Trip Assignment

**Redis Key Pattern:** `customer:active-trip:{customerId}`

```typescript
await this.activeTripService.setUserActiveTripId(
  customerId,
  UserType.CUSTOMER,
  trip._id,
);
```

**File:** `src/redis/services/active-trip.service.ts:23`

```typescript
async setUserActiveTripId(
  userId: string,
  userType: UserType,
  tripId: string,
): Promise<boolean> {
  const key = RedisKeyGenerator.userActiveTrip(userId, userType);
  await this.client.set(key, tripId);
  await this.client.expire(key, this.ACTIVE_TRIP_EXPIRY); // TTL
  return true;
}
```

**Redis Key Generator:**
```typescript
// src/redis/redis-key.generator.ts:10
static userActiveTrip(userId: string, userType: UserType): string {
  return `${userType}:active-trip:${userId}`;
}
```

### Driver Queue Management

A separate queue is created for each driver:

**Redis Key Pattern:** `driver:{driverId}:trip-queue`

```typescript
// Add trip to each driver's queue
for (const driverId of driverIds) {
  await this.driverTripQueueService.addTripToDriverQueue(
    driverId,
    tripId,
    priority,
    customerLocation,
  );
}
```

**Queue Item Structure:**
```typescript
interface DriverQueueItem {
  tripId: string;
  priority: number;
  addedAt: number;
  customerLocation: {
    lat: number;
    lon: number;
  };
}
```

### Redis Data Structures

```typescript
// Driver queue - Using Sorted Set
await this.client.zadd(queueKey, priority, JSON.stringify(queueItem));
await this.client.expire(queueKey, 24 * 60 * 60); // 24 hours TTL
```

## ⚡ 6. Queue System Architecture

### Sequential Driver Queue System

**Main Flow:**
```typescript
// 1. Add trip to driver queues
this.tripQueueService.addTripRequestSequential(
  trip._id,
  driverIds,
  { lat, lon },
  2, // priority
);
```

**File:** `src/queue/services/trip-queue.service.ts:448`

```typescript
async addTripRequestSequential(
  tripId: string,
  driverIds: string[],
  customerLocation: { lat: number; lon: number },
  priority: number = 2,
): Promise<void> {
  // Add to each driver's queue
  for (const driverId of driverIds) {
    await this.driverTripQueueService.addTripToDriverQueue(
      driverId,
      tripId,
      priority,
      customerLocation,
    );
  }

  // Start processing for each driver
  for (const driverId of driverIds) {
    setTimeout(() => this.processNextDriverRequest(driverId), 100);
  }
}
```

### Driver Processing Status

**Redis Key Pattern:** `driver:{driverId}:processing`

```typescript
await this.driverTripQueueService.setDriverProcessingTrip(
  driverId,
  nextTrip.tripId,
  this.config.driverResponseTimeout, // 20 seconds default
);
```

This key indicates that the driver is currently processing a trip request and is automatically deleted with TTL.

### Queue Priority System

Using Redis Sorted Set for priority-based ordering:

- **Lower number = Higher priority**
- Priority values: 1 (highest) - 5 (lowest)
- Priority decreases during retry scenarios

## 🌐 7. WebSocket Notifications and Driver Delivery

### Driver Processing Flow

```typescript
async processNextDriverRequest(driverId: string): Promise<void> {
  // Is driver already processing another trip?
  const isProcessing = await this.driverTripQueueService.isDriverProcessingTrip(driverId);
  if (isProcessing) {
    return;
  }

  // Get next trip from queue
  const nextTrip = await this.driverTripQueueService.popNextTripForDriver(driverId);
  if (!nextTrip) {
    return;
  }

  // Set processing status
  await this.driverTripQueueService.setDriverProcessingTrip(
    driverId,
    nextTrip.tripId,
    this.config.driverResponseTimeout, // 20 seconds
  );

  // Create Bull Queue job
  await this.addTripRequest(jobData);
}
```

### Event System Integration

**WebSocket Notification:**
```typescript
// Send WebSocket notification when trip request is sent to driver
await this.event2Service.sendToUser(
  driverId,
  EventType.TRIP_REQUEST,
  tripData,
  UserType.DRIVER,
);
```

**File:** `src/modules/event/event_v2.service.ts:31`

```typescript
async sendToUser(
  userId: string,
  eventType: EventType,
  eventData: any,
  userType: UserType,
): Promise<void> {
  // Real-time notification to driver via WebSocket connection
  await this.webSocketService.sendToUser(userId, eventType, eventData);
}
```

## 🔑 Redis Key Patterns and TTL Values

### Key Formats

| Key Pattern | Description | TTL | Data Type |
|------------|----------|-----|-----------|
| `customer:active-trip:{customerId}` | Customer's active trip ID | 24h | String |
| `driver:active-trip:{driverId}` | Driver's active trip ID | 24h | String |
| `driver:{driverId}:trip-queue` | Driver's trip queue | 24h | Sorted Set |
| `driver:{driverId}:processing` | Driver's processing status | 20s | String |
| `driver:{driverId}:last-request` | Driver's last request | 3min | String |
| `location:driver:geo` | Driver location geo index | Persistent | Geo Set |

### Redis Operations Pipeline

Using Redis pipeline for performance:

```typescript
const pipeline = this.client.multi();
pipeline.set(activeKey, tripId);
pipeline.expire(activeKey, ttl);
pipeline.zadd(queueKey, priority, queueItem);
const results = await pipeline.exec();
```

## ⏱️ Timeout and Recovery Mechanism

### Driver Response Timeout

Default: **20 seconds**

```typescript
// Timeout value from config
driverResponseTimeout: this.configService.get('tripDriverResponseTimeout', 20)
```

### Timeout Job Scheduling

An automatic timeout job is created for each trip request:

```typescript
await this.addTimeoutJob({
  tripId: jobData.tripId,
  driverId: jobData.driverId,
  timeoutType: 'driver_response',
  scheduledAt: new Date(Date.now() + this.config.driverResponseTimeout * 1000),
  metadata: {
    customerLocation: jobData.customerLocation,
    originalDriverIds: jobData.originalDriverIds,
    retryCount: jobData.retryCount,
  },
});
```

This timeout job is automatically triggered if the driver doesn't respond within 20 seconds and moves to the next driver in queue.

## 🚀 Performance Optimizations

### Concurrent Operations

Drivers are processed in parallel:

```typescript
// Parallel processing for each driver independently
for (const driverId of driverIds) {
  setTimeout(() => this.processNextDriverRequest(driverId), 100);
}
```

### Geographic Indexing

Using Redis GEO commands for O(log(N)) complexity nearby driver search.

### Queue Prioritization

Using Sorted Set for O(log(N)) complexity priority-based queue management.

---

## 📝 Summary

The customer trip request system operates within a modern microservice architecture integrating Redis, MongoDB, WebSocket, and Queue systems. The system is designed to be high-performance and fault-tolerant, providing real-time notifications and geographic search capabilities.

**Core Flow:**
1. Customer request → Validation
2. Driver search (geographic) → Database update  
3. Redis active trip + driver queues → Sequential processing
4. WebSocket notifications → Driver delivery

The system operates robustly with lock mechanisms, timeout handling, and retry logic.