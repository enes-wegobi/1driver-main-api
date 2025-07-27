import { DriverAvailabilityStatus } from 'src/common/enums/driver-availability-status.enum';
import { AppState } from 'src/common/enums/app-state.enum';
import { UserType } from 'src/common/user-type.enum';

export interface WebSocketConnectionData {
  socketId: string;
  deviceId: string;
  connectedAt: string;
  lastActivity: string;
}

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export interface LocationWithTimestamp extends LocationCoordinates {
  lastUpdate: string;
}

export interface DriverLocationData {
  // Geographic coordinates
  lat: number;
  lng: number;
  
  // Timestamps
  timestamp: string;
  
  // Driver business logic
  availability: DriverAvailabilityStatus;
  
  // User status
  appState: AppState;
  
  // WebSocket connection (optional)
  websocket?: WebSocketConnectionData;
}

export interface CustomerLocationData {
  // Optional geographic coordinates (can be added later)
  lat?: number;
  lng?: number;
  
  // Timestamps
  timestamp: string;
  
  // User status
  isActive: boolean;
  appState: AppState;
  
  // WebSocket connection (optional)
  websocket?: WebSocketConnectionData;
}

export interface UserStatusResponse {
  userId: string;
  userType: UserType;
  isActive: boolean;
  appState: AppState;
  timestamp: string;
  
  // WebSocket data (common)
  websocket?: WebSocketConnectionData;
  
  // Driver-specific data
  location?: LocationCoordinates;
  availability?: DriverAvailabilityStatus;
  
  // Customer-specific data
  customerLocation?: LocationWithTimestamp;
}

export interface NearbyDriverResult {
  driverId: string;
  distance: number;
  location: LocationCoordinates;
  availability: DriverAvailabilityStatus;
  appState: AppState;
  isActive: boolean;
  timestamp: string;
}

export interface BatchUserStatusResult {
  userId: string;
  isActive: boolean;
  data?: DriverLocationData | CustomerLocationData;
}

export interface DriverConnectionResult {
  userId: string;
  previousSocket?: WebSocketConnectionData;
  preservedAvailability: DriverAvailabilityStatus;
  shouldForceLogout: boolean;
}

export interface CustomerConnectionResult {
  userId: string;
  previousSocket?: WebSocketConnectionData;
  shouldForceLogout: boolean;
}

export interface UserStatusSummary {
  totalUsers: number;
  activeUsers: number;
  foregroundUsers: number;
  backgroundUsers: number;
  connectedWebSockets: number;
}

export interface DriverStatusSummary extends UserStatusSummary {
  availableDrivers: number;
  busyDrivers: number;
  onTripDrivers: number;
}