export interface DeviceInfo {
  model?: string;
  os?: string;
  osVersion?: string;
  userAgent?: string;
}

export class DeviceUtils {
  /**
   * Parse device info from user agent string
   * @param userAgent User agent string
   * @returns Device info object
   */
  static parseDeviceInfo(userAgent?: string): DeviceInfo {
    if (!userAgent) {
      return { userAgent: 'unknown' };
    }

    const deviceInfo: DeviceInfo = { userAgent };

    // iOS detection
    if (userAgent.includes('iPhone')) {
      deviceInfo.model = 'iPhone';
      deviceInfo.os = 'iOS';
      const iosMatch = userAgent.match(/OS (\d+_\d+)/);
      if (iosMatch) {
        deviceInfo.osVersion = iosMatch[1].replace('_', '.');
      }
    } else if (userAgent.includes('iPad')) {
      deviceInfo.model = 'iPad';
      deviceInfo.os = 'iOS';
      const iosMatch = userAgent.match(/OS (\d+_\d+)/);
      if (iosMatch) {
        deviceInfo.osVersion = iosMatch[1].replace('_', '.');
      }
    }
    // Android detection
    else if (userAgent.includes('Android')) {
      deviceInfo.os = 'Android';
      const androidMatch = userAgent.match(/Android (\d+\.?\d*)/);
      if (androidMatch) {
        deviceInfo.osVersion = androidMatch[1];
      }
      // Try to extract device model
      const modelMatch = userAgent.match(/\(([^)]+)\)/);
      if (modelMatch) {
        deviceInfo.model = modelMatch[1].split(';')[0].trim();
      }
    }
    // Web browser detection
    else if (userAgent.includes('Chrome')) {
      deviceInfo.os = 'Web';
      deviceInfo.model = 'Chrome Browser';
    } else if (userAgent.includes('Firefox')) {
      deviceInfo.os = 'Web';
      deviceInfo.model = 'Firefox Browser';
    } else if (userAgent.includes('Safari')) {
      deviceInfo.os = 'Web';
      deviceInfo.model = 'Safari Browser';
    }

    return deviceInfo;
  }

  /**
   * Get client IP address from request
   * @param request Express request object
   * @returns IP address string
   */
  static getClientIpAddress(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Generate a device fingerprint from request headers
   * @param userAgent User agent string
   * @param acceptLanguage Accept-Language header
   * @param acceptEncoding Accept-Encoding header
   * @returns Device fingerprint string
   */
  static generateDeviceFingerprint(
    userAgent?: string,
    acceptLanguage?: string,
    acceptEncoding?: string,
  ): string {
    const components = [
      userAgent || 'unknown',
      acceptLanguage || 'unknown',
      acceptEncoding || 'unknown',
    ];
    
    // Simple hash function for fingerprinting
    let hash = 0;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return Math.abs(hash).toString(16);
  }
}
