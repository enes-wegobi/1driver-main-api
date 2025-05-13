import { UserType } from 'src/common/user-type.enum';

/**
 * Centralized Redis key management utility
 * This class provides static methods for generating consistent Redis keys
 * throughout the application.
 */
export class RedisKeyGenerator {
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
}
