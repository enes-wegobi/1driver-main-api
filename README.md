# 1Driver Main API

Backend API for the 1Driver ride-hailing platform. Handles trips, real-time tracking, payments, and notifications.

## Tech Stack

- **Framework**: NestJS + Fastify
- **Database**: MongoDB (Mongoose)
- **Cache/Queue**: Redis + BullMQ
- **Real-time**: Socket.IO
- **Payments**: Stripe
- **Storage**: AWS S3 / DigitalOcean Spaces
- **Notifications**: Expo Push, SMS

## Features

- Customer & Driver authentication (OTP-based)
- Real-time trip management and tracking
- Driver matching and assignment
- Payment processing with Stripe
- WebSocket communication
- Push notifications
- Document verification for drivers
- Support ticket system

## Project Structure

```
src/
├── modules/           # Feature modules
│   ├── auth/         # Authentication
│   ├── trip/         # Trip management
│   ├── customers/    # Customer profiles
│   ├── drivers/      # Driver management
│   ├── payments/     # Stripe integration
│   ├── location/     # GPS & mapping
│   └── notifications/# Push & SMS
├── websocket/        # Real-time events
├── queue/            # Background jobs
├── redis/            # Redis services
└── main.ts           # Entry point
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB
- Redis

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Core
NODE_ENV=development
PORT=3000

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=2592000

# MongoDB
TRIP_MONGODB_URI=mongodb://localhost:27017/1driver

# Redis
VALKEY_HOST=localhost
VALKEY_PORT=6379

# External Services
GOOGLE_MAPS_API_KEY=your-key
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Storage (S3/Spaces)
SPACES_REGION=your-region
SPACES_ENDPOINT=your-endpoint
SPACES_ACCESS_KEY_ID=your-key
SPACES_SECRET_ACCESS_KEY=your-secret
SPACES_BUCKET_NAME=your-bucket
```

### Running the App

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Documentation

Swagger UI available at `/api/docs` when running.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Development with watch |
| `npm run build` | Build for production |
| `npm run start:prod` | Run production build |
| `npm run test` | Run tests |
| `npm run lint` | Lint code |
| `npm run seed:admin` | Create admin user |

## Docker

```bash
docker build -t 1driver-api .
docker run -p 3000:3000 --env-file .env 1driver-api
```

## Health Checks

- `GET /api/health` - Overall health
- `GET /api/health/ready` - Readiness probe
- `GET /api/health/live` - Liveness probe
