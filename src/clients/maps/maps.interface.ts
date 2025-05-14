export interface Coordinates {
  lat: number;
  lon: number;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  name: string;
}

export interface DistanceResponse {
  success: boolean;
  origin?: {
    coordinates: string;
    address: string;
  };
  destination?: {
    coordinates: string;
    address: string;
  };
  waypoints?: {
    coordinates: string;
    address: string;
  }[];
  distance?: {
    text: string;
    value: number; // meters
  };
  duration?: {
    text: string;
    value: number; // seconds
  };
  message?: string;
  error?: string;
}
