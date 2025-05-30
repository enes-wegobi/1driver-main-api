import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseRedisService } from './base-redis.service';
import { RedisKeyGenerator } from '../redis-key.generator';
import { UserType } from 'src/common/user-type.enum';
import { DriverAvailabilityStatus } from 'src/websocket/dto/driver-location.dto';
import { FindNearbyUsersResult } from '../dto/nearby-user.dto';
import { WithErrorHandling } from '../decorators/with-error-handling.decorator';

// Import DTO types
import { NearbyUserDto, NearbyDriverDto, NearbyCustomerDto, Coordinates } from '../dto/nearby-user.dto';

interface ParsedLocationData {
  availabilityStatus?: DriverAvailabilityStatus;
  updatedAt?: string;
  accuracy?: number;
  heading?: number;
  speed?: number;
  altitude?: number;
  timestamp?: string;
  [key: string]: any;
}

// Constants
const GEOSEARCH_RESULT = {
  USER_ID_INDEX: 0,
  DISTANCE_INDEX: 1,
  COORDINATES_INDEX: 2,
  MIN_RESULT_LENGTH: 3,
  MIN_COORDINATES_LENGTH: 2,
} as const;

const VALIDATION_LIMITS = {
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
  MIN_RADIUS: 0.1,
  MAX_RADIUS: 100,
} as const;

@Injectable()
export class NearbySearchService extends BaseRedisService {
  constructor(configService: ConfigService) {
    super(configService);
  }

  @WithErrorHandling([])
  async findNearbyUsers(
    userType: UserType,
    latitude: number,
    longitude: number,
    radius: number = 5,
    onlyAvailable: boolean = false,
  ): Promise<FindNearbyUsersResult> {
    // Input validation
    this.validateInputs(latitude, longitude, radius);

    const geoKey = RedisKeyGenerator.nearbyUsers(userType);

    const results = await this.client.geosearch(
      geoKey,
      'FROMLONLAT',
      longitude,
      latitude,
      'BYRADIUS',
      radius,
      'km',
      'WITHDIST',
      'WITHCOORD',
    );

    if (!results || !Array.isArray(results) || results.length === 0) {
      return [];
    }

    // Filter valid results first
    const validResults = results.filter(this.isValidGeoSearchResult);

    if (validResults.length === 0) {
      return [];
    }

    // Batch fetch user location data (solves N+1 problem)
    const locationKeys = validResults.map(result => 
      RedisKeyGenerator.userLocation(result[GEOSEARCH_RESULT.USER_ID_INDEX].toString())
    );

    // Also batch fetch availability status for drivers
    const availabilityKeys = userType === UserType.DRIVER 
      ? validResults.map(result => 
          RedisKeyGenerator.driverStatus(result[GEOSEARCH_RESULT.USER_ID_INDEX].toString())
        )
      : [];

    // Fetch both location and availability data in parallel
    const [locationDataArray, availabilityDataArray] = await Promise.all([
      this.client.mget(...locationKeys),
      availabilityKeys.length > 0 ? this.client.mget(...availabilityKeys) : Promise.resolve([])
    ]);

    // Process results
    const enhancedResults: NearbyUserDto[] = [];

    for (let i = 0; i < validResults.length; i++) {
      const result = validResults[i];
      const locationDataStr = locationDataArray[i];
      const availabilityDataStr = availabilityDataArray[i] || null;

      try {
        const processedUser = this.processUserResult(
          result,
          locationDataStr,
          availabilityDataStr,
          userType,
          onlyAvailable
        );

        if (processedUser) {
          enhancedResults.push(processedUser);
        }
      } catch (error) {
        console.warn(
          `Failed to process user ${result[GEOSEARCH_RESULT.USER_ID_INDEX]}:`,
          error
        );
        // Continue processing other users
        continue;
      }
    }

    return enhancedResults;
  }

  @WithErrorHandling([])
  async findNearbyAvailableDrivers(
    latitude: number,
    longitude: number,
    radius: number = 5,
  ): Promise<FindNearbyUsersResult> {
    return this.findNearbyUsers(
      UserType.DRIVER,
      latitude,
      longitude,
      radius,
      true,
    );
  }

  // Helper Methods

  private validateInputs(
    latitude: number,
    longitude: number,
    radius: number
  ): void {
    if (
      latitude < VALIDATION_LIMITS.MIN_LATITUDE ||
      latitude > VALIDATION_LIMITS.MAX_LATITUDE
    ) {
      throw new Error(
        `Invalid latitude: ${latitude}. Must be between ${VALIDATION_LIMITS.MIN_LATITUDE} and ${VALIDATION_LIMITS.MAX_LATITUDE}`
      );
    }

    if (
      longitude < VALIDATION_LIMITS.MIN_LONGITUDE ||
      longitude > VALIDATION_LIMITS.MAX_LONGITUDE
    ) {
      throw new Error(
        `Invalid longitude: ${longitude}. Must be between ${VALIDATION_LIMITS.MIN_LONGITUDE} and ${VALIDATION_LIMITS.MAX_LONGITUDE}`
      );
    }

    if (
      radius < VALIDATION_LIMITS.MIN_RADIUS ||
      radius > VALIDATION_LIMITS.MAX_RADIUS
    ) {
      throw new Error(
        `Invalid radius: ${radius}. Must be between ${VALIDATION_LIMITS.MIN_RADIUS} and ${VALIDATION_LIMITS.MAX_RADIUS} km`
      );
    }
  }

  private isValidGeoSearchResult(result: unknown): result is any[] {
    return (
      Array.isArray(result) &&
      result.length >= GEOSEARCH_RESULT.MIN_RESULT_LENGTH &&
      result[GEOSEARCH_RESULT.USER_ID_INDEX] &&
      result[GEOSEARCH_RESULT.DISTANCE_INDEX] &&
      result[GEOSEARCH_RESULT.COORDINATES_INDEX] &&
      Array.isArray(result[GEOSEARCH_RESULT.COORDINATES_INDEX]) &&
      result[GEOSEARCH_RESULT.COORDINATES_INDEX].length >= GEOSEARCH_RESULT.MIN_COORDINATES_LENGTH
    );
  }

  private parseUserLocationData(locationDataStr: string | null): ParsedLocationData | null {
    if (!locationDataStr) {
      return null;
    }

    try {
      return JSON.parse(locationDataStr);
    } catch (error) {
      console.warn('Failed to parse user location data:', error);
      return null;
    }
  }

  private parseAvailabilityData(availabilityDataStr: string | null): { status: DriverAvailabilityStatus } | null {
    if (!availabilityDataStr) {
      return null;
    }

    try {
      // First try to parse as JSON
      const parsed = JSON.parse(availabilityDataStr);
      
      // Handle different possible JSON structures
      if (typeof parsed === 'string') {
        return { status: parsed as DriverAvailabilityStatus };
      }
      
      if (parsed && typeof parsed === 'object') {
        return {
          status: parsed.status || parsed.availabilityStatus || parsed.availability
        };
      }
      
      return null;
    } catch (error) {
      // If JSON.parse fails, treat as plain string
      // availabilityDataStr is something like 'available' or 'AVAILABLE'
      const trimmedStatus = availabilityDataStr.trim();
      
      if (trimmedStatus) {
        return { status: trimmedStatus as DriverAvailabilityStatus };
      }
      
      return null;
    }
  }

  private shouldSkipUser(
    userData: ParsedLocationData | null,
    userType: UserType,
    onlyAvailable: boolean
  ): boolean {
    return (
      onlyAvailable &&
      userType === UserType.DRIVER &&
      userData?.availabilityStatus !== DriverAvailabilityStatus.AVAILABLE
    );
  }

  private processUserResult(
    result: any[],
    locationDataStr: string | null,
    availabilityDataStr: string | null,
    userType: UserType,
    onlyAvailable: boolean
  ): NearbyUserDto | null {
    const userId = result[GEOSEARCH_RESULT.USER_ID_INDEX].toString();
    const distance = parseFloat(result[GEOSEARCH_RESULT.DISTANCE_INDEX].toString());
    const coords = result[GEOSEARCH_RESULT.COORDINATES_INDEX];

    const userData = this.parseUserLocationData(locationDataStr);
    const availabilityData = this.parseAvailabilityData(availabilityDataStr);

    // Merge availability data with user data
    const combinedUserData = {
      ...userData,
      ...(availabilityData && { availabilityStatus: availabilityData.status })
    };

    // Skip if filtering for available users and this one isn't available
    if (this.shouldSkipUser(combinedUserData, userType, onlyAvailable)) {
      return null;
    }

    // Validate coordinates
    if (
      !Array.isArray(coords) ||
      coords.length < GEOSEARCH_RESULT.MIN_COORDINATES_LENGTH ||
      !coords[0] ||
      !coords[1]
    ) {
      throw new Error(`Invalid coordinates for user ${userId}`);
    }

    const longitude = parseFloat(coords[0].toString());
    const latitude = parseFloat(coords[1].toString());

    // Validate parsed coordinates
    if (isNaN(longitude) || isNaN(latitude) || isNaN(distance)) {
      throw new Error(`Invalid numeric values for user ${userId}`);
    }

    const result_obj = {
      userId,
      distance,
      coordinates: {
        longitude,
        latitude,
      },
      userType,
      updatedAt: combinedUserData?.updatedAt || new Date().toISOString(),
      ...(combinedUserData || {}),
    };
    return result_obj;
  }
}