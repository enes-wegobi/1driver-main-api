import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { LoggerService } from 'src/logger/logger.service';
import { AppStartupResponseDto } from '../dto/app-startup-response.dto';
import { AppType } from '../enums/app-type.enum';

@Injectable()
export class AppVersionService {
  constructor(
    private readonly configService: NestConfigService,
    private readonly logger: LoggerService,
  ) {}

  checkForceUpdate(appType: AppType, currentVersion: string): AppStartupResponseDto {
    const latestVersion = this.getAppVersion(appType);
    const forceUpdate = this.isVersionLower(currentVersion, latestVersion);
    return {
      forceUpdate,
      latestVersion,
    };
  }

  private getAppVersion(appType: AppType): string {
    switch (appType) {
      case AppType.DRIVER:
        return this.configService.get<string>('appVersion.driverLatestVersion', '1.0.0');
      case AppType.CUSTOMER:
        return this.configService.get<string>('appVersion.customerLatestVersion', '1.0.0');
      default:
        return '1.0.0';
    }
  }

  private isVersionLower(currentVersion: string, latestVersion: string): boolean {
    try {
      const current = this.parseVersion(currentVersion);
      const latest = this.parseVersion(latestVersion);

      if (current.major !== latest.major) {
        return current.major < latest.major;
      }
      
      return current.minor < latest.minor;
    } catch (error) {
      this.logger.warn(
        `Invalid version format: current=${currentVersion} minimum=${latestVersion}`,
      );
      return false;
    }
  }

  private parseVersion(version: string): { major: number; minor: number; patch: number } {
    const parts = version.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(parts[0], 10),
      minor: parseInt(parts[1], 10),
      patch: parseInt(parts[2], 10),
    };
  }
}