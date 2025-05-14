import { Injectable, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Coordinates, DistanceResponse, RoutePoint } from './maps.interface';
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

      // Format coordinates for Google Maps API
      const originCoords = `${origin.lat},${origin.lon}`;
      const destCoords = `${destination.lat},${destination.lon}`;

      // Format waypoints for Google Maps API
      const waypointsParam =
        waypoints.length > 0
          ? waypoints.map((wp) => `${wp.lat},${wp.lon}`).join('|')
          : null;

      // Prepare request parameters
      const params: any = {
        origins: originCoords,
        destinations: destCoords,
        key: this.configService.googleMapsApiKey,
      };

      // Add waypoints if they exist
      if (waypointsParam) {
        params.waypoints = waypointsParam;
      }

      // Send request to Google Distance Matrix API
      const response = await axios.get(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        {
          params,
        },
      );

      // Check API response
      if (response.data.status !== 'OK') {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          RedisErrors.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract distance and duration information
      const distanceData = response.data.rows[0].elements[0];

      if (distanceData.status === 'ZERO_RESULTS') {
        throw new RedisException(
          RedisErrors.INVALID_REQUEST.code,
          RedisErrors.INVALID_REQUEST.message,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result: DistanceResponse = {
        success: true,
        origin: {
          coordinates: originCoords,
          address: response.data.origin_addresses[0],
        },
        destination: {
          coordinates: destCoords,
          address: response.data.destination_addresses[0],
        },
        distance: {
          text: distanceData.distance.text,
          value: distanceData.distance.value, // meters
        },
        duration: {
          text: distanceData.duration.text,
          value: distanceData.duration.value, // seconds
        },
      };

      // Add waypoints information if available
      if (waypoints.length > 0 && response.data.waypoint_addresses) {
        result.waypoints = waypoints.map((wp, index) => ({
          coordinates: `${wp.lat},${wp.lon}`,
          address: response.data.waypoint_addresses[index] || 'Unknown address',
        }));
      }

      return result;
    } catch (error) {
      console.error('Maps Service Error:', error.message);

      // If it's already a TripException, rethrow it
      if (error instanceof RedisException) {
        throw error;
      }

      // Otherwise, wrap it in a TripException
      throw new RedisException(
        RedisErrors.INVALID_REQUEST.code,
        RedisErrors.INVALID_REQUEST.message,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
