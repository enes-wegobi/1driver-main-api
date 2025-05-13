import { Logger } from '@nestjs/common';

/**
 * Decorator for handling errors in Redis service methods.
 * Wraps the method in a try/catch block, logs the error, and returns a default value.
 *
 * @param defaultValue The value to return when an error occurs (defaults to false)
 * @returns Method decorator
 *
 * @example
 * // Return false on error
 * @WithErrorHandling()
 * async markDriverAsActive(driverId: string) {
 *   // Method implementation without try/catch
 * }
 *
 * @example
 * // Return empty array on error
 * @WithErrorHandling([])
 * async getActiveDrivers(): Promise<string[]> {
 *   // Method implementation without try/catch
 * }
 *
 * @example
 * // Return specific enum value on error
 * @WithErrorHandling(DriverAvailabilityStatus.BUSY)
 * async getDriverAvailability(driverId: string): Promise<DriverAvailabilityStatus> {
 *   // Method implementation without try/catch
 * }
 */
export function WithErrorHandling(defaultValue: any = false) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // Assuming this.logger exists on the class
        if (this.logger && this.logger instanceof Logger) {
          this.logger.error(`Error in ${propertyKey}:`, error.message);
        }
        return defaultValue;
      }
    };

    return descriptor;
  };
}
