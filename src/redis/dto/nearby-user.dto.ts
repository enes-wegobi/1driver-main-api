import { UserType } from 'src/common/user-type.enum';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';

/**
 * Coordinates interface representing longitude and latitude
 */
export interface Coordinates {
  longitude: number;
  latitude: number;
}

/**
 * Base interface for nearby users (both customers and drivers)
 */
export interface NearbyUserDto {
  userId: string;
  distance: number;
  coordinates: Coordinates;
  userType: UserType;
  updatedAt: string;
  // Additional location data that might be present
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp?: string;
}

/**
 * Interface for nearby drivers, extending the base nearby user interface
 */
export interface NearbyDriverDto extends NearbyUserDto {
  userType: UserType.DRIVER;
  availabilityStatus?: DriverAvailabilityStatus;
}

/**
 * Interface for nearby customers, extending the base nearby user interface
 */
export interface NearbyCustomerDto extends NearbyUserDto {
  userType: UserType.CUSTOMER;
}

/**
 * Type for the return value of findNearbyUsers method
 * It returns an array of either NearbyDriverDto or NearbyCustomerDto depending on the userType parameter
 */
export type FindNearbyUsersResult = NearbyUserDto[];
