import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);

  /**
   * Reads a secret from Docker Swarm secrets or falls back to environment variable
   * @param secretName The name of the secret
   * @param envVarName Optional environment variable name (defaults to secretName.toUpperCase())
   * @returns The secret value or null if not found
   */
  readSecret(secretName: string, envVarName?: string): string | null {
    try {
      const secretPath = path.join('/run/secrets', secretName);

      // Try to read from Docker Swarm secrets first
      if (fs.existsSync(secretPath)) {
        const secretValue = fs.readFileSync(secretPath, 'utf8').trim();
        this.logger.debug(`Successfully read secret: ${secretName}`);
        return secretValue;
      }

      // Fallback to environment variable for development
      const envVar = envVarName || secretName.toUpperCase();
      const envValue = process.env[envVar];

      if (envValue) {
        this.logger.debug(
          `Using environment variable fallback for: ${secretName} -> ${envVar}`,
        );
        return envValue;
      }

      this.logger.warn(
        `Secret not found: ${secretName} (checked ${secretPath} and ${envVar})`,
      );
      return null;
    } catch (error) {
      this.logger.error(`Error reading secret ${secretName}:`, error);
      return null;
    }
  }

  /**
   * Reads a secret and throws an error if not found
   * @param secretName The name of the secret
   * @param envVarName Optional environment variable name
   * @returns The secret value
   * @throws Error if secret is not found
   */
  readRequiredSecret(secretName: string, envVarName?: string): string {
    const secret = this.readSecret(secretName, envVarName);
    if (!secret) {
      throw new Error(`Required secret not found: ${secretName}`);
    }
    return secret;
  }

  /**
   * Reads a secret with a default value
   * @param secretName The name of the secret
   * @param defaultValue Default value if secret is not found
   * @param envVarName Optional environment variable name
   * @returns The secret value or default value
   */
  readSecretWithDefault(
    secretName: string,
    defaultValue: string,
    envVarName?: string,
  ): string {
    return this.readSecret(secretName, envVarName) || defaultValue;
  }

  /**
   * Builds MongoDB URI using secrets
   * @returns MongoDB connection URI
   */
  buildMongoURI(): string {
    const user = this.readSecret('trip_mongodb_user', 'TRIP_MONGODB_USER');
    const password = this.readSecret(
      'trip_mongodb_password',
      'TRIP_MONGODB_PASSWORD',
    );
    const host = process.env.TRIP_MONGODB_HOST;
    const port = process.env.TRIP_MONGODB_PORT;
    const database = process.env.TRIP_MONGODB_DATABASE || 'admin';

    if (!user || !password) {
      // Fallback to existing environment variable if secrets are not available
      const existingUri = process.env.TRIP_MONGODB_URI;
      if (existingUri) {
        this.logger.debug(
          'Using existing TRIP_MONGODB_URI environment variable',
        );
        return existingUri;
      }
      throw new Error(
        'MongoDB credentials not found in secrets or environment variables',
      );
    }

    // Check if host is already a mongodb+srv:// URI (Digital Ocean case)
    if (host?.startsWith('mongodb+srv://')) {
      // Extract hostname from the SRV URI
      const hostname = host.replace('mongodb+srv://', '');
      const uri = `mongodb+srv://${user}:${password}@${hostname}/${database}?authSource=admin`;
      this.logger.debug('Built MongoDB SRV URI from secrets for Digital Ocean');
      return uri;
    }

    // Standard MongoDB connection (legacy/self-hosted)
    if (!host || !port) {
      throw new Error(
        'MongoDB host and port are required for standard connections',
      );
    }

    const uri = `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=admin`;
    this.logger.debug('Built standard MongoDB URI from secrets');
    return uri;
  }
}
