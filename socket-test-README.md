# WebSocket Test Clients

This repository contains two HTML-based test clients for the WebSocket functionality of the customer-api-gateway:

1. `socket-test.html` - Basic test client for local development
2. `remote-socket-test.html` - Advanced test client with additional debugging features for remote server connections

Both clients allow you to:

1. Connect to the WebSocket server with JWT authentication
2. Update driver availability status (available, busy, offline)
3. Send location updates
4. View real-time event logs

## Basic Client (socket-test.html)

### How to Use

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

### Features

#### Connection Management
- Connect to the WebSocket server with JWT authentication
- View connection status
- Disconnect from the server

#### Driver Status
- Update driver availability status (available, busy, offline)
- Only enabled when connected as a driver

#### Location Updates
- Send location updates with:
  - Latitude and longitude
  - Accuracy, heading, and speed
  - Option to use your current browser location

#### Event Logging
- Real-time logging of all WebSocket events
- Clear log functionality
- Formatted JSON display for easy reading

## Advanced Client (remote-socket-test.html)

### How to Use

1. Open the `remote-socket-test.html` file in your browser
2. The client is pre-configured for the remote server at `https://1drive-dev.wegobitest.com`
3. Enter your JWT token and click "Connect"
4. If connection fails, use the "Advanced" tab to adjust connection parameters:
   - Try different transport options (WebSocket only, Polling only, or both)
   - Adjust timeout and reconnection settings
   - Customize headers and query parameters

### Additional Features

#### Tabbed Interface
- Organized sections for Connection, Driver Status, Location, Advanced Options, and Logs

#### Advanced Connection Options
- Configure transport protocols (WebSocket, Polling, or both)
- Adjust timeout and reconnection settings
- Add custom headers and query parameters
- Specify Socket.IO path

#### Enhanced Logging
- More detailed event logging
- Copy logs to clipboard
- Console logging for debugging

#### Connection Debugging
- Detailed connection error reporting
- Reconnection attempt tracking
- Socket.IO ping/pong monitoring

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

## Requirements for Both Clients

- Modern web browser with JavaScript enabled
- Valid JWT token for authentication
- Running WebSocket server (customer-api-gateway)

## Troubleshooting Remote Connections

If you're having trouble connecting to the remote server:

1. Check that your JWT token is valid and not expired
2. Try using the "Advanced" tab in the remote client to:
   - Change the transport to "Polling Only" if WebSockets are blocked
   - Increase the connection timeout
   - Adjust the Socket.IO path if the server uses a non-standard path
3. Check browser console for additional error details
4. Ensure the server allows connections from your origin (CORS)
5. Verify that the server supports the Socket.IO client version being used
