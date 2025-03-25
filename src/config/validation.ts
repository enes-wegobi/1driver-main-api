import { plainToClass } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsOptional()
  @IsNumber()
  PORT: number;

  @IsOptional()
  @IsString()
  HOST: string;

  @IsOptional()
  @IsString()
  CORS_ORIGINS: string;

  @IsOptional()
  @IsString()
  USERS_SERVICE_URL: string;

  @IsOptional()
  @IsNumber()
  USERS_SERVICE_TIMEOUT: number;

  @IsOptional()
  @IsString()
  PRODUCTS_SERVICE_URL: string;

  @IsOptional()
  @IsNumber()
  PRODUCTS_SERVICE_TIMEOUT: number;

  @IsOptional()
  @IsString()
  JWT_SECRET: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    console.error(errors.toString());
    throw new Error('Config validation error!');
  }

  return validatedConfig;
}
