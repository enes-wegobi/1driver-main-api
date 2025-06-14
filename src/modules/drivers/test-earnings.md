# Driver Earnings System Test Guide

## 🎯 Test Scenarios

### 1. Environment Variables
Add to your `.env` file:
```
DRIVER_EARNINGS_PER_MINUTE=0.5
```

### 2. API Endpoints to Test

#### Get Current Week Earnings
```bash
GET /drivers/earnings/current-week
Authorization: Bearer <driver_jwt_token>
```

Expected Response:
```json
{
  "driverId": "driver123",
  "totalTrips": 0,
  "totalDuration": 0,
  "totalEarnings": 0,
  "trips": [],
  "status": "ACTIVE",
  "weekStartDate": "2024-01-15T00:00:00.000Z",
  "weekEndDate": "2024-01-21T23:59:59.999Z"
}
```

#### Get Earnings History
```bash
GET /drivers/earnings/history?page=1&limit=10
Authorization: Bearer <driver_jwt_token>
```

### 3. Test Flow

1. **Complete a Trip**: 
   - Create a trip with a driver
   - Complete the trip (status: COMPLETED)
   - Process payment successfully
   - Check if `driverEarnings` field is populated in trip
   - Check if weekly earnings are updated

2. **Check Weekly Earnings**:
   - Call `/drivers/earnings/current-week`
   - Verify trip appears in `trips` array
   - Verify totals are calculated correctly

3. **Test Weekly Transition** (Manual):
   - Call the cron job manually or wait for Monday 09:00
   - Check that ACTIVE records become COMPLETED
   - Check that new ACTIVE records are created

### 4. Database Verification

Check MongoDB collections:
- `trips` - should have `driverEarnings` field
- `driverweeklyearnings` - should have weekly records

### 5. Calculation Example

For a trip with:
- Duration: 1800 seconds (30 minutes)
- Rate: 0.5 TL per minute
- Expected earnings: 30 × 0.5 = 15 TL

### 6. Logs to Monitor

Look for these log messages:
- "Driver earnings calculated for trip..."
- "Adding trip earnings for driver..."
- "Updated weekly earnings for driver..."
- "Starting weekly transition process..."

## 🚀 Quick Test Commands

```bash
# Test current week endpoint
curl -X GET "http://localhost:3000/drivers/earnings/current-week" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"

# Test history endpoint
curl -X GET "http://localhost:3000/drivers/earnings/history?page=1&limit=5" \
  -H "Authorization: Bearer YOUR_DRIVER_TOKEN"
