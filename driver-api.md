# Driver API Documentation
## 1Driver Main API - Driver Functionality

### Overview
This document provides comprehensive documentation for all driver-related functionality in the 1Driver main API. Drivers can authenticate, manage profiles, accept trips, track earnings, upload documents, and receive real-time updates through this API.

---

## Table of Contents
1. [Authentication & Account Management](#authentication--account-management)
2. [Driver Profile Management](#driver-profile-management)
3. [Trip Management System](#trip-management-system)
4. [Earnings & Payment System](#earnings--payment-system)
5. [Document Management & Verification](#document-management--verification)
6. [Bank Information Management](#bank-information-management)
7. [Real-time Communication & Location](#real-time-communication--location)
8. [Penalty & Violations System](#penalty--violations-system)
9. [External Services](#external-services)
10. [API Reference](#api-reference)

---

## Authentication & Account Management

### Driver Authentication Flow

```mermaid
sequenceDiagram
    participant D as Driver
    participant API as Main API
    participant SMS as SMS Service
    participant US as User Service
    participant Redis as Redis

    D->>API: POST /auth/driver/initiate-signup {name, surname, phone, email}
    API->>US: Create driver & generate OTP
    US-->>API: Driver created, OTP generated
    API->>SMS: Send OTP via SMS
    SMS-->>D: SMS with OTP code
    API-->>D: Signup initiated

    D->>API: POST /auth/driver/complete-signup {phone, otp}
    API->>US: Verify OTP & complete signup
    US-->>API: JWT token + driver data
    API->>Redis: Store session with device tracking
    API-->>D: JWT token + driver profile

    Note over D,Redis: Driver is now authenticated
    
    D->>API: POST /auth/driver/initiate-signin {phone}
    API->>US: Generate signin OTP
    US-->>API: OTP generated
    API->>SMS: Send OTP via SMS
    API-->>D: OTP sent

    D->>API: POST /auth/driver/complete-signin {phone, otp}
    API->>US: Verify OTP
    US-->>API: JWT token + driver data
    API->>Redis: Replace/update session
    API-->>D: JWT token
```

### Endpoints:
- `POST /auth/driver/initiate-signup` - Start driver registration process
- `POST /auth/driver/complete-signup` - Complete registration with OTP
- `POST /auth/driver/initiate-signin` - Request signin OTP
- `POST /auth/driver/complete-signin` - Complete signin with OTP
- `POST /auth/driver/resend-otp` - Resend OTP code
- `POST /auth/driver/logout` - Logout and clear session

### Key Features:
- **OTP-based Authentication**: Secure phone-based verification
- **Device Tracking**: Single active session per driver with device identification
- **Session Management**: Redis-based JWT token management
- **Force Logout**: Automatic logout on new device signin
- **Driver Registration**: Name, surname, phone, and email required

---

## Driver Profile Management

### Profile Management Flow

```mermaid
flowchart TD
    A[Driver Profile] --> B[Get Profile]
    A --> C[Update Profile]
    A --> D[Photo Management]
    A --> E[Contact Updates]
    A --> F[Notifications]
    A --> G[Delete Account]
    A --> H[Rate Customer]
    
    C --> C1[Update Name/Surname]
    D --> D1[Upload Photo to S3]
    D --> D2[Delete Photo]
    E --> E1[Initiate Email Update]
    E --> E2[Complete Email Update]
    E --> E3[Initiate Phone Update]
    E --> E4[Complete Phone Update]
    F --> F1[Update Notification Permissions]
    F --> F2[Expo Token Management]
    H --> H1[Rate Completed Trip Customer]
    
    E1 --> E5[Send OTP Email]
    E3 --> E6[Send OTP SMS]
```

### Endpoints (`/drivers/*`):
- `GET /drivers/me` - Get driver profile
- `PATCH /drivers/me/profile` - Update profile information
- `DELETE /drivers/me` - Delete driver account
- `POST /drivers/initiate-email-update` - Start email update process
- `POST /drivers/complete-email-update` - Complete email update with OTP
- `POST /drivers/initiate-phone-update` - Start phone update process
- `POST /drivers/complete-phone-update` - Complete phone update with OTP
- `POST /drivers/photo` - Upload profile photo
- `DELETE /drivers/photo` - Delete profile photo
- `PATCH /drivers/me/notification-permissions` - Update notification settings
- `PUT /drivers/expo-token` - Set Expo push notification token
- `DELETE /drivers/expo-token` - Remove Expo token
- `PATCH /drivers/:id/rate` - Rate customer after completed trip

### Key Features:
- **Secure Updates**: OTP verification for email/phone changes
- **File Management**: S3 integration for profile photos
- **Notification Control**: Granular notification permissions
- **Push Notifications**: Expo token management for mobile notifications
- **Customer Rating**: Rate customers after trip completion

---

## Trip Management System

### Complete Driver Trip Workflow

```mermaid
sequenceDiagram
    participant D as Driver
    participant API as Main API
    participant WS as WebSocket
    participant Customer as Customer App
    participant Queue as Trip Queue

    Customer->>API: Request driver for trip
    API->>Queue: Add trip to driver queue
    Queue-->>D: Trip request notification via WebSocket
    
    D->>API: GET /driver-trips/last-request
    API-->>D: Trip request details
    
    alt Accept Trip
        D->>API: POST /driver-trips/accept/{tripId}
        API->>WS: Notify customer of driver acceptance
        WS-->>Customer: Driver accepted, trip approved
        API->>Queue: Clear driver last request
        
        D->>API: POST /driver-trips/start-en-route
        API->>WS: Driver en route to pickup
        WS-->>Customer: Driver is coming
        
        D->>API: POST /driver-trips/arrive-at-pickup
        API->>WS: Driver arrived at pickup
        WS-->>Customer: Driver has arrived
        
        D->>API: POST /driver-trips/start-trip
        API->>WS: Trip started
        WS-->>Customer: Trip in progress
        
        D->>API: POST /driver-trips/arrived-at-stop
        API->>WS: Trip completed
        WS-->>Customer: Trip completed
        
    else Decline Trip
        D->>API: POST /driver-trips/decline/{tripId}
        API->>Queue: Remove from driver queue
        API->>Queue: Find next available driver
        API->>Queue: Clear driver last request
    end
```

### Trip Status Flow for Drivers

```mermaid
stateDiagram-v2
    [*] --> WAITING_FOR_DRIVER: Trip request received
    WAITING_FOR_DRIVER --> APPROVED: Driver accepts
    WAITING_FOR_DRIVER --> DRIVER_NOT_FOUND: Driver declines
    
    APPROVED --> DRIVER_ON_WAY_TO_PICKUP: Start en-route
    DRIVER_ON_WAY_TO_PICKUP --> ARRIVED_AT_PICKUP: Arrive at pickup
    ARRIVED_AT_PICKUP --> TRIP_IN_PROGRESS: Start trip
    TRIP_IN_PROGRESS --> PAYMENT: Arrive at destination
    
    PAYMENT --> COMPLETED: Payment successful
    COMPLETED --> [*]: Trip finished
    
    APPROVED --> CANCELLED: Driver cancels
    DRIVER_ON_WAY_TO_PICKUP --> CANCELLED: Driver cancels
    ARRIVED_AT_PICKUP --> CANCELLED: Driver cancels
```

### Endpoints (`/driver-trips/*`):
- `GET /driver-trips/active` - Get current active trip
- `GET /driver-trips/last-request` - Get last trip request
- `POST /driver-trips/accept/:tripId` - Accept trip request
- `POST /driver-trips/decline/:tripId` - Decline trip request
- `POST /driver-trips/start-en-route` - Start driving to pickup location
- `POST /driver-trips/arrive-at-pickup` - Mark arrival at pickup
- `POST /driver-trips/start-trip` - Start the trip (customer in vehicle)
- `POST /driver-trips/arrived-at-stop` - Complete trip at destination
- `POST /driver-trips/cancel` - Cancel trip as driver
- `GET /driver-trips/statistics` - Get driver trip statistics
- `GET /driver-trips/history` - Get trip history (paginated)
- `GET /driver-trips/:id` - Get specific trip details
- `PATCH /driver-trips/:id/rate` - Rate completed trip customer
- `POST /driver-trips/:id/comment` - Add comment to trip

### Key Features:
- **Real-time Trip Queue**: Automatic trip request distribution
- **Trip Status Management**: Complete trip lifecycle control
- **Trip History**: Comprehensive trip record keeping
- **Statistics**: Driver performance metrics and analytics
- **Customer Rating**: Rate customers after trip completion
- **Trip Comments**: Add notes to completed trips

---

## Earnings & Payment System

### Driver Earnings Flow

```mermaid
flowchart TD
    A[Trip Completed] --> B[Calculate Earnings]
    B --> C[Add to Weekly Earnings]
    C --> D{Week Complete?}
    D -->|Yes| E[Finalize Weekly Earnings]
    D -->|No| F[Continue Accumulating]
    E --> G[Payment Processing]
    G --> H[Update Payment Status]
    H --> I[Driver Paid]
    F --> J[Next Trip]
    J --> A
```

### Weekly Earnings System

```mermaid
flowchart TD
    A[Monday] --> B[Track Daily Earnings]
    B --> C[Tuesday - Sunday]
    C --> D[Week End]
    D --> E[Calculate Total Earnings]
    E --> F[Generate Earnings Record]
    F --> G[Payment Processing]
    G --> H{Payment Successful?}
    H -->|Yes| I[Mark as Paid]
    H -->|No| J[Retry Payment]
    I --> K[New Week Starts]
    J --> G
```

### Endpoints:
**Driver Earnings (`/drivers/earnings/*`)**:
- `GET /drivers/earnings` - Get all earnings with pagination
- `GET /drivers/earnings/:id` - Get specific earnings details

### Key Features:
- **Weekly Earnings**: Automatic weekly earnings calculation
- **Trip Tracking**: Individual trip earnings within weekly periods
- **Payment Status**: Track payment processing and completion
- **Earnings History**: Comprehensive earnings record with pagination
- **Earnings Details**: Detailed breakdown by trips and multipliers

---

## Document Management & Verification

### Document Upload & Verification Flow

```mermaid
sequenceDiagram
    participant D as Driver
    participant API as Main API
    participant S3 as AWS S3
    participant US as User Service

    D->>API: POST /drivers/upload/driver-licence-front
    API->>API: Validate file type & size
    API->>S3: Upload file to S3 bucket
    S3-->>API: File uploaded, return URL
    API->>US: Update driver with file URL
    US-->>API: File metadata saved
    API-->>D: Upload successful

    Note over D,US: Admin reviews document
    
    API->>API: PUT /drivers/files/driver-licence-front/verify {isVerified: true}
    API->>US: Update verification status
    US-->>API: Status updated
    API-->>D: Document verified (push notification)
```

### Document Types & Requirements

```mermaid
flowchart TD
    A[Driver Documents] --> B[Driver License Front]
    A --> C[Driver License Back]
    
    B --> D[Upload Required]
    C --> E[Upload Required]
    D --> F[Admin Verification]
    E --> G[Admin Verification]
    F --> H{Approved?}
    G --> I{Approved?}
    H -->|Yes| J[Driver Eligible]
    H -->|No| K[Re-upload Required]
    I -->|Yes| J
    I -->|No| L[Re-upload Required]
    J --> M[Can Accept Trips]
```

### Endpoints (`/drivers/*`):
- `POST /drivers/upload/:fileType` - Upload document file
- `DELETE /drivers/files/:fileType` - Delete uploaded document
- `PUT /drivers/files/:fileType/verify` - Verify document (admin only)

### Supported File Types:
- `DRIVERS_LICENSE_FRONT` - Front side of driver license
- `DRIVERS_LICENSE_BACK` - Back side of driver license

### Key Features:
- **S3 Integration**: Secure file storage with unique keys
- **File Validation**: Type and size validation
- **Verification System**: Admin-controlled document approval
- **Replace Functionality**: Automatic old file cleanup when uploading new
- **Document Status**: Track verification status per document

---

## Bank Information Management

### Bank Account Management Flow

```mermaid
flowchart TD
    A[Driver Bank Info] --> B[Add Bank Account]
    A --> C[View Bank Accounts]
    A --> D[Delete Bank Account]
    A --> E[Set Default Account]
    
    B --> B1[Validate Bank Details]
    B1 --> B2[Save Bank Information]
    B2 --> B3[Available for Payments]
    
    E --> E1[Update Default Status]
    E1 --> E2[Unset Previous Default]
    E2 --> E3[Set New Default]
    
    D --> D1[Remove Bank Account]
    D1 --> D2{Is Default?}
    D2 -->|Yes| D3[Clear Default Status]
    D2 -->|No| D4[Account Deleted]
    D3 --> D4
```

### Endpoints (`/drivers/bank-info/*`):
- `POST /drivers/bank-info` - Add new bank information
- `GET /drivers/bank-info` - Get all bank information
- `DELETE /drivers/bank-info/:bankInfoId` - Delete bank information
- `PUT /drivers/bank-info/:bankInfoId/set-default` - Set default bank account

### Key Features:
- **Multiple Bank Accounts**: Support for multiple bank accounts
- **Default Account**: Set preferred account for payments
- **Account Validation**: Bank account details validation
- **Secure Storage**: Encrypted bank information storage

---

## Real-time Communication & Location

### WebSocket Connection & Location Updates

```mermaid
sequenceDiagram
    participant D as Driver App
    participant WS as WebSocket Gateway
    participant Redis as Redis
    participant API as Main API
    
    D->>WS: Connect with JWT token
    WS->>WS: Validate JWT & device
    WS->>Redis: Mark driver as active
    WS->>Redis: Set availability status
    WS-->>D: Connection established
    
    loop Real-time Updates
        D->>WS: Location update with availability status
        WS->>Redis: Store location & status
        API->>WS: Trip request notification
        WS->>D: Emit trip request
        D->>WS: Trip response (accept/decline)
        WS->>API: Forward response
    end
    
    D->>WS: Update availability status
    WS->>Redis: Update driver status
    
    D->>WS: Disconnect
    WS->>Redis: Mark driver as inactive
    WS->>Redis: Clear location data
```

### Driver Availability States

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE: Driver goes online
    AVAILABLE --> BUSY: Temporary unavailability
    AVAILABLE --> ON_TRIP: Trip accepted
    BUSY --> AVAILABLE: Driver becomes available
    ON_TRIP --> AVAILABLE: Trip completed
    ON_TRIP --> [*]: Driver goes offline
    AVAILABLE --> [*]: Driver goes offline
    BUSY --> [*]: Driver goes offline
```

### Location & Status Management:
- **Real-time Location**: Continuous location tracking during availability
- **Availability Status**: Three states - Available, Busy, On Trip
- **Trip Notifications**: Real-time trip request notifications
- **Location History**: Track driver movement during trips
- **Offline Detection**: Automatic status updates when driver disconnects

### Key Features:
- **Real-time Updates**: WebSocket for instant location and status updates
- **Trip Queue Integration**: Automatic trip request distribution to available drivers
- **Status Management**: Driver availability control
- **Location Tracking**: GPS location updates with status information
- **Connection Management**: Handle disconnections and reconnections gracefully

---

## Penalty & Violations System

### Driver Penalty Management

```mermaid
flowchart TD
    A[Driver Violation] --> B[System Detects Issue]
    B --> C[Generate Penalty]
    C --> D[Add to Driver Record]
    D --> E[Notify Driver]
    E --> F{Penalty Type}
    F -->|Financial| G[Payment Required]
    F -->|Warning| H[Record Only]
    G --> I{Payment Made?}
    I -->|Yes| J[Penalty Resolved]
    I -->|No| K[Restrict Driver]
    H --> L[Continue Driving]
    K --> M[Account Suspended]
```

### Endpoints (`/driver-penalties/*`):
- `GET /driver-penalties` - Get all driver penalties
- `GET /driver-penalties/unpaid` - Get unpaid penalties

### Key Features:
- **Penalty Tracking**: Comprehensive violation record keeping
- **Payment Integration**: Financial penalties with payment tracking
- **Account Restrictions**: Automatic restrictions for unpaid penalties
- **Penalty History**: Complete penalty history for drivers

---

## External Services

### Service Integration Map

```mermaid
graph TD
    API[1Driver Main API] --> US[User Service]
    API --> S3[AWS S3]
    API --> SMS[SMS Service]
    API --> Expo[Expo Push Service]
    API --> Maps[Maps Service]
    API --> Redis[Redis Cache]
    
    US --> |Driver Data| CRUD[CRUD Operations]
    S3 --> |Files| Docs[Document Storage]
    SMS --> |OTP| Verify[Verification Codes]
    Expo --> |Push| Notify[Mobile Notifications]
    Maps --> |Routes| Distance[Distance Calculation]
    Redis --> |Cache| Session[Session & Location Management]
```

### External Services Used:

1. **AWS S3 Storage**
   - Profile photo storage
   - Document storage (driver licenses)
   - Secure file upload/download

2. **SMS Service**
   - OTP delivery for authentication
   - Phone verification for updates

3. **Expo Push Notifications**
   - Mobile app notifications
   - Trip request notifications
   - Real-time alerts

4. **Maps Service**
   - Route calculation for trips
   - Distance and duration estimation

5. **Redis Cache**
   - Session management
   - Real-time location storage
   - WebSocket connection tracking
   - Trip queue management

6. **External User Service**
   - Driver profile storage
   - Authentication management
   - Document verification status

---

## API Reference

### Authentication Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
x-device-id: <DEVICE_ID>
```

### Common Request/Response Examples

#### Driver Signup
```json
POST /auth/driver/initiate-signup
{
  "name": "John",
  "surname": "Doe",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "expoToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}

Response:
{
  "success": true,
  "message": "OTP sent to phone number"
}
```

#### Trip Acceptance
```json
POST /driver-trips/accept/trip_123
{}

Response:
{
  "success": true,
  "message": "Trip accepted successfully",
  "trip": {
    "tripId": "trip_123",
    "customerId": "cust_456",
    "origin": {
      "lat": 40.7128,
      "lon": -74.0060,
      "address": "New York, NY"
    },
    "destination": {
      "lat": 40.7589,
      "lon": -73.9851,
      "address": "Times Square, NY"
    },
    "fare": 1500,
    "status": "APPROVED"
  }
}
```

#### Bank Information Setup
```json
POST /drivers/bank-info
{
  "bankName": "Chase Bank",
  "accountNumber": "1234567890",
  "routingNumber": "021000021",
  "accountHolderName": "John Doe"
}

Response:
{
  "success": true,
  "message": "Bank information added successfully",
  "bankInfo": {
    "id": "bank_123",
    "bankName": "Chase Bank",
    "accountNumber": "****7890",
    "isDefault": false
  }
}
```

#### Document Upload
```json
POST /drivers/upload/driver-licence-front
Content-Type: multipart/form-data

file: [binary data]

Response:
{
  "message": "File uploaded successfully",
  "fileKey": "userId123/driver-licence-front/uuid-filename.jpg",
  "fileType": "driver-licence-front",
  "fileUrl": "https://s3.amazonaws.com/bucket/key"
}
```

### Error Responses
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone",
      "value": "invalid_phone"
    }
  }
}
```

---

## Driver Capabilities Summary

### What drivers can do with these APIs:

1. **Account Management**
   - Register and authenticate securely with OTP
   - Manage profile information and preferences
   - Update contact information with verification
   - Upload and manage profile photos
   - Delete account when needed

2. **Trip Management**
   - Receive real-time trip requests
   - Accept or decline trip requests
   - Manage complete trip lifecycle from pickup to completion
   - View trip history and statistics
   - Rate customers after trip completion
   - Add comments to completed trips

3. **Earnings & Payments**
   - Track weekly earnings automatically
   - View detailed earnings history
   - Monitor payment status and processing
   - Access earnings statistics and reports

4. **Document Management**
   - Upload driver license documents to secure storage
   - Track document verification status
   - Replace documents when needed
   - Ensure compliance with platform requirements

5. **Banking & Payments**
   - Add multiple bank accounts for payments
   - Set default payment account
   - Manage bank information securely
   - Receive weekly payments to chosen account

6. **Real-time Experience**
   - Share location in real-time while available
   - Manage availability status (available/busy/on_trip)
   - Receive instant trip notifications
   - Communicate via push notifications
   - Handle real-time trip status updates

7. **Penalty & Compliance**
   - View penalty history and status
   - Track unpaid penalties
   - Maintain account compliance
   - Resolve violations promptly

This comprehensive API enables drivers to have a complete ride-sharing experience from registration to earning management with real-time trip handling, document verification, and secure payment processing.