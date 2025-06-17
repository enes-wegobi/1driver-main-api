import { Injectable, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import {
  BatchDistanceRequest,
  BatchDistanceResponse,
  DistanceResponse,
  RoutePoint,
} from './maps.interface';
import { RedisErrors } from 'src/common/redis-errors';
import { RedisException } from 'src/common/redis.exception';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class MapsService {
  constructor(private configService: ConfigService) {}

  async getDistanceMatrix(
    routePoints: RoutePoint[],
  ): Promise<DistanceResponse> {
    try {
      if (!routePoints || routePoints.length < 2) {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          RedisErrors.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Use the natural array order
      const sortedPoints = [...routePoints];

      // Get origin (first point) and destination (last point)
      const origin = sortedPoints[0];
      const destination = sortedPoints[sortedPoints.length - 1];

      // Extract waypoints (all points except first and last)
      const waypoints = sortedPoints.slice(1, sortedPoints.length - 1);

      if (
        !origin ||
        !destination ||
        !origin.lat ||
        !origin.lon ||
        !destination.lat ||
        !destination.lon
      ) {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          RedisErrors.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
        );
      }


      // Build Routes API request body
      const requestBody = {
        origins: [{
          waypoint: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lon
              }
            }
          }
        }],
        destinations: [{
          waypoint: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lon
              }
            }
          }
        }],
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      };

      // Add intermediate waypoints if they exist
      if (waypoints.length > 0) {
        requestBody.destinations = waypoints.map(wp => ({
          waypoint: {
            location: {
              latLng: {
                latitude: wp.lat,
                longitude: wp.lon
              }
            }
          }
        }));
        requestBody.destinations.push({
          waypoint: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lon
              }
            }
          }
        });
      }

      // Send request to Google Routes API
      const response = await axios.post(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.configService.googleMapsApiKey,
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
          }
        }
      );

      // Check if we have valid results
      if (!response.data || !response.data.length) {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          'No route found',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Get the first result (origin to destination)
      const routeResult = response.data[0];

      // Check if route exists using the condition field (Routes API v2 format)
      if (routeResult.condition !== 'ROUTE_EXISTS') {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          `Route calculation failed: ${routeResult.condition || 'Unknown error'}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Format coordinates for backward compatibility
      const originCoords = `${origin.lat},${origin.lon}`;
      const destCoords = `${destination.lat},${destination.lon}`;

      // Convert duration from seconds string to readable format
      const durationSeconds = parseInt(routeResult.duration?.replace('s', '') || '0');
      const durationText = this.formatDuration(durationSeconds);

      // Convert distance from meters to readable format
      const distanceMeters = routeResult.distanceMeters || 0;
      const distanceText = this.formatDistance(distanceMeters);

      const result: DistanceResponse = {
        success: true,
        origin: {
          coordinates: originCoords,
          address: origin.name || 'Origin'
        },
        destination: {
          coordinates: destCoords,
          address: destination.name || 'Destination'
        },
        distance: {
          text: distanceText,
          value: distanceMeters
        },
        duration: {
          text: durationText,
          value: durationSeconds
        }
      };

      // Add waypoints information if available
      if (waypoints.length > 0) {
        result.waypoints = waypoints.map(wp => ({
          coordinates: `${wp.lat},${wp.lon}`,
          address: wp.name || 'Waypoint'
        }));
      }

      return result;
    } catch (error) {
      console.error('Maps Service Error:', error.message);

      // If it's already a RedisException, rethrow it
      if (error instanceof RedisException) {
        throw error;
      }

      // Otherwise, wrap it in a RedisException
      throw new RedisException(
        RedisErrors.INVALID_REQUEST.code,
        error.response?.data?.error?.message || error.message || RedisErrors.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getBatchDistances(
    request: BatchDistanceRequest,
  ): Promise<BatchDistanceResponse> {
    try {
      // Validate input
      if (
        !request.referencePoint ||
        !request.driverLocations ||
        request.driverLocations.length === 0
      ) {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          RedisErrors.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Build Routes API request body
      const requestBody = {
        origins: [{
          waypoint: {
            location: {
              latLng: {
                latitude: request.referencePoint.lat,
                longitude: request.referencePoint.lon
              }
            }
          }
        }],
        destinations: request.driverLocations.map(driver => ({
          waypoint: {
            location: {
              latLng: {
                latitude: driver.coordinates.lat,
                longitude: driver.coordinates.lon
              }
            }
          }
        })),
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE'
      };

      // Send request to Google Routes API
      const response = await axios.post(
        'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.configService.googleMapsApiKey,
            'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status,condition'
          }
        }
      );

      // Check if we have valid results
      if (!response.data || !Array.isArray(response.data)) {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          'No routes found',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Process results and map them to driver IDs
      const results = {};

      response.data.forEach((routeResult, index) => {
        if (index < request.driverLocations.length && routeResult.condition === 'ROUTE_EXISTS') {
          const driver = request.driverLocations[index];
          const durationSeconds = parseInt(routeResult.duration?.replace('s', '') || '0');
          
          results[driver.driverId] = {
            coordinates: driver.coordinates,
            distance: routeResult.distanceMeters || 0,
            duration: durationSeconds,
          };
        }
      });

      return {
        success: true,
        referencePoint: request.referencePoint,
        results: results,
      };
    } catch (error) {
      console.error('Maps Service Batch Distance Error:', error.message);

      // If it's already a RedisException, rethrow it
      if (error instanceof RedisException) {
        throw error;
      }

      // Otherwise, wrap it in a RedisException
      throw new RedisException(
        RedisErrors.INVALID_REQUEST.code,
        error.response?.data?.error?.message || error.message || RedisErrors.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} sec${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      if (remainingSeconds === 0) {
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
      }
      return `${minutes} min${minutes !== 1 ? 's' : ''} ${remainingSeconds} sec${remainingSeconds !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${meters} m`;
    }
    
    const kilometers = (meters / 1000).toFixed(1);
    return `${kilometers} km`;
  }
}
