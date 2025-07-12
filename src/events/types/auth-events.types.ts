import { UserType } from 'src/common/user-type.enum';

export interface ForceLogoutRequestedEvent {
  userId: string;
  userType: UserType;
  oldDeviceId: string;
  newDeviceId: string;
  reason: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    oldSessionInfo?: any;
    expoToken?: string;
  };
  timestamp: Date;
}

export interface ForceLogoutCompletedEvent {
  userId: string;
  userType: UserType;
  oldDeviceId: string;
  newDeviceId: string;
  reason: string;
  result: {
    success: boolean;
    webSocketNotified: boolean;
    pushNotificationSent: boolean;
    sessionLogged: boolean;
    error?: string;
  };
  timestamp: Date;
}

export interface SuspiciousActivityDetectedEvent {
  userId: string;
  userType: UserType;
  attempts: {
    deviceId: string;
    ipAddress?: string;
    timestamp: string;
    userAgent?: string;
  }[];
  timestamp: Date;
}

export interface WebSocketLogoutEvent {
  userId: string;
  userType: UserType;
  deviceId: string;
  reason: string;
  sessionInfo?: any;
  timestamp: Date;
}

export interface PushNotificationLogoutEvent {
  userId: string;
  userType: UserType;
  deviceId: string;
  reason: string;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    oldSessionInfo?: any;
    expoToken?: string;
  };
  timestamp: Date;
}

export interface SessionLogEvent {
  userId: string;
  userType: UserType;
  oldDeviceId: string;
  newDeviceId: string;
  ipAddress?: string;
  timestamp: Date;
}