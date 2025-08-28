import { UserType } from 'src/common/user-type.enum';

/**
 * Centralized Redis key management utility
 * This class provides static methods for generating consistent Redis keys
 * throughout the application.
 */
export class RedisKeyGenerator {
  // Active trip keys
  static userActiveTrip(userId: string, userType: UserType): string {
    return `${userType}:active-trip:${userId}`;
  }

  // User location keys
  static userLocation(userId: string): string {
    return `location:user:${userId}`;
  }

  // Geo index keys
  static geoIndex(userType: string): string {
    return `location:${userType}:geo`;
  }

  // Active user keys
  static driverActive(driverId: string): string {
    return `driver:active:${driverId}`;
  }

  static customerActive(customerId: string): string {
    return `customer:active:${customerId}`;
  }

  // Driver status key
  static driverStatus(driverId: string): string {
    return `driver:status:${driverId}`;
  }

  // ========== OPTIONAL: APP STATE KEY ==========
  // (Only add if you need to track app state separately)
  static driverAppState(driverId: string): string {
    return `driver:app-state:${driverId}`;
  }

  static customerAppState(customerId: string): string {
    return `customer:app-state:${customerId}`;
  }

  // Active users sets
  static activeDriversSet(): string {
    return 'drivers:active';
  }

  static activeCustomersSet(): string {
    return 'customers:active';
  }

  // Helper method for nearby users
  static nearbyUsers(userType: UserType): string {
    return this.geoIndex(userType);
  }

  static userActiveToken(userId: string, userType: UserType): string {
    return `auth:user:active_token:${userType}:${userId}`;
  }

  static sessionActivity(userId: string, userType: UserType): string {
    return `auth:user:session_activity:${userType}:${userId}`;
  }

  // Driver trip queue keys (new sequential system)
  static driverTripQueue(driverId: string): string {
    return `driver:${driverId}:trip-queue`;
  }

  static driverProcessingTrip(driverId: string): string {
    return `driver:${driverId}:processing`;
  }

  static driverLastRequest(driverId: string): string {
    return `driver:${driverId}:last-request`;
  }

  // WebSocket connection keys
  static userActiveWebSocket(userId: string, userType: UserType): string {
    return `ws:user:active_socket:${userType}:${userId}`;
  }
}
