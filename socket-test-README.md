# WebSocket Test Client

This is a simple HTML-based test client for the WebSocket functionality of the customer-api-gateway. It allows you to:

1. Connect to the WebSocket server with JWT authentication
2. Update driver availability status (available, busy, offline)
3. Send location updates
4. View real-time event logs

## How to Use

1. Open the `socket-test.html` file in your browser
2. Configure the connection:
   - Server URL: The URL of your WebSocket server (default: http://localhost:3000)
   - JWT Token: A valid JWT token for authentication (must be for a driver user to test all functionality)
3. Click "Connect" to establish a WebSocket connection
4. Once connected:
   - If connected as a driver, you can update your availability status
   - You can send location updates
   - You can use your current browser location (requires permission)
   - All events and responses will be logged in the Event Log section

## Features

### Connection Management
- Connect to the WebSocket server with JWT authentication
- View connection status
- Disconnect from the server

### Driver Status
- Update driver availability status (available, busy, offline)
- Only enabled when connected as a driver

### Location Updates
- Send location updates with:
  - Latitude and longitude
  - Accuracy, heading, and speed
  - Option to use your current browser location

### Event Logging
- Real-time logging of all WebSocket events
- Clear log functionality
- Formatted JSON display for easy reading

## WebSocket Events Used

| Event | Direction | Description |
|-------|-----------|-------------|
| `connection` | Server → Client | Sent when connection is established |
| `error` | Server → Client | Sent when an error occurs |
| `updateDriverAvailability` | Client → Server | Update driver availability status |
| `updateDriverLocation` | Client → Server | Send driver location with availability |
| `updateLocation` | Client → Server | Send location update (for any user type) |
| `locationUpdate` | Server → Client | Receive location updates in trip rooms |
| `nearbyDriverUpdate` | Server → Client | Receive nearby driver updates |

## Requirements

- Modern web browser with JavaScript enabled
- Valid JWT token for authentication
- Running WebSocket server (customer-api-gateway)
