# Docker Swarm Secrets Implementation

This document describes the Docker Swarm secrets implementation for the 1Driver main-api service.

## 🔐 Overview

The application now supports Docker Swarm secrets while maintaining backward compatibility with environment variables for development. Secrets are automatically read from `/run/secrets/<secret_name>` in production and fall back to environment variables in development.

## 📋 Supported Secrets

### Main API Secrets
- `jwt_secret` - JWT token signing key (fallback: `JWT_SECRET`)
- `mongodb_user` - MongoDB username (fallback: `TRIP_MONGODB_USER`)
- `mongodb_password` - MongoDB password (fallback: `TRIP_MONGODB_PASSWORD`)
- `datadog_api_key` - DataDog API key (fallback: `DATADOG_API_KEY`)
- `valkey_password` - Valkey/Redis password (fallback: `VALKEY_PASSWORD`)
- `queue_redis_password` - Queue Redis password (fallback: `QUEUE_REDIS_PASSWORD`)
- `google_maps_api_key` - Google Maps API key (fallback: `GOOGLE_MAPS_API_KEY`)
- `stripe_webhook_secret` - Stripe webhook secret (fallback: `STRIPE_WEBHOOK_SECRET`)
- `stripe_secret_key` - Stripe secret key (fallback: `STRIPE_SECRET_KEY`)
- `spaces_access_key_id` - DigitalOcean Spaces access key (fallback: `SPACES_ACCESS_KEY_ID`)
- `spaces_secret_access_key` - DigitalOcean Spaces secret key (fallback: `SPACES_SECRET_ACCESS_KEY`)
- `expo_access_token` - Expo push notification token (fallback: `EXPO_ACCESS_TOKEN`)

## 🏗️ Architecture

### SecretsService
The `SecretsService` provides methods to read secrets with automatic fallback:

```typescript
// Read a secret with fallback to environment variable
const secret = secretsService.readSecret('jwt_secret', 'JWT_SECRET');

// Read a required secret (throws error if not found)
const requiredSecret = secretsService.readRequiredSecret('mongodb_password');

// Read a secret with default value
const secretWithDefault = secretsService.readSecretWithDefault('jwt_secret', 'default_value');
```

### Configuration Integration
The configuration system automatically uses secrets when available:

```typescript
// In configuration.ts
jwt: {
  secret: secretsService.readSecretWithDefault('jwt_secret', 'supersecret', 'JWT_SECRET'),
  expiresIn: parseInt(process.env.JWT_EXPIRES_IN || '36000', 10),
}
```

### MongoDB URI Builder
The service automatically builds MongoDB URIs from secrets:

```typescript
// Automatically constructs: mongodb://user:password@host:port/database?authSource=admin
const mongoUri = secretsService.buildMongoURI();
```

## 🚀 Usage in Development

In development, the application continues to work with environment variables as before:

```bash
# .env file
JWT_SECRET=your_jwt_secret
MONGODB_USER=your_mongo_user
MONGODB_PASSWORD=your_mongo_password
```

## 🐳 Usage in Production (Docker Swarm)

### Creating Secrets
```bash
# Create secrets
echo "your_jwt_secret" | docker secret create jwt_secret -
echo "your_mongo_user" | docker secret create mongodb_user -
echo "your_mongo_password" | docker secret create mongodb_password -
```

### Docker Compose Configuration
```yaml
version: '3.8'
services:
  main-api:
    image: 1driver-main-api
    secrets:
      - jwt_secret
      - mongodb_user
      - mongodb_password
      - datadog_api_key
      - valkey_password
      - queue_redis_password
      - google_maps_api_key
      - stripe_webhook_secret
      - stripe_secret_key
      - spaces_access_key_id
      - spaces_secret_access_key
      - expo_access_token

secrets:
  jwt_secret:
    external: true
  mongodb_user:
    external: true
  mongodb_password:
    external: true
  datadog_api_key:
    external: true
  valkey_password:
    external: true
  queue_redis_password:
    external: true
  google_maps_api_key:
    external: true
  stripe_webhook_secret:
    external: true
  stripe_secret_key:
    external: true
  spaces_access_key_id:
    external: true
  spaces_secret_access_key:
    external: true
  expo_access_token:
    external: true
```

## 🔧 Implementation Details

### Files Modified
- `src/config/secrets.service.ts` - New service for reading secrets
- `src/config/configuration.ts` - Updated to use secrets
- `src/config/config.service.ts` - Added MongoDB URI helper method
- `src/config/config.module.ts` - Added SecretsService provider

### Backward Compatibility
The implementation maintains full backward compatibility:
- Development environments continue to use environment variables
- Existing configuration methods work unchanged
- No breaking changes to the public API

### Error Handling
- Graceful fallback to environment variables
- Detailed logging for debugging
- Clear error messages for missing required secrets

## 🔍 Debugging

### Checking Secret Availability
```bash
# Inside container, check if secrets are mounted
ls -la /run/secrets/

# Read a specific secret
cat /run/secrets/jwt_secret
```

### Application Logs
The SecretsService provides detailed logging:
- `DEBUG`: Successfully read secrets
- `DEBUG`: Environment variable fallbacks
- `WARN`: Secrets not found
- `ERROR`: Read errors

### Service Logs
```bash
# Check service logs
docker service logs 1driver-prod_1driver-main-api --tail 50
```

## 🔒 Security Benefits

1. **Encrypted at Rest**: Secrets are encrypted in Docker Swarm
2. **Encrypted in Transit**: Secure transmission to containers
3. **Access Control**: Only authorized containers can access secrets
4. **No Git Exposure**: Secrets never stored in repository
5. **Audit Trail**: Docker Swarm provides audit logging
6. **Rotation Support**: Easy secret rotation without code changes

## 📝 Migration Checklist

- [x] Create SecretsService for reading secrets
- [x] Update configuration.ts to use secrets
- [x] Update config.service.ts with MongoDB URI builder
- [x] Add SecretsService to config.module.ts
- [x] Maintain backward compatibility with environment variables
- [x] Add comprehensive error handling and logging
- [ ] Create Docker secrets in production environment
- [ ] Update Docker Compose files to use secrets
- [ ] Test in production environment
- [ ] Update deployment scripts

## 🔄 Secret Rotation

Secrets can be rotated without application downtime:

```bash
# Create new version of secret
echo "new_secret_value" | docker secret create jwt_secret_v2 -

# Update service to use new secret
docker service update --secret-rm jwt_secret --secret-add jwt_secret_v2 1driver-main-api

# Remove old secret
docker secret rm jwt_secret
```

The application will automatically pick up the new secret on the next configuration read.
