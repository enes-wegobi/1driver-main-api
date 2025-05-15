export interface Coordinates {
  lat: number;
  lon: number;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  name: string;
}

export interface BatchDistanceRequest {
  referencePoint: Coordinates;
  driverLocations: {
    driverId: string;
    coordinates: Coordinates;
  }[];
}

export interface BatchDistanceResponse {
  success: boolean;
  referencePoint?: Coordinates;
  results?: {
    [driverId: string]: {
      coordinates: Coordinates;
      distance?: number;
      duration?: number;
    };
  };
  message?: string;
  error?: string;
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
