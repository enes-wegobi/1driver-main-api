# WebSocket Driver Frontend Test Client

This is a simple frontend application for testing WebSocket functionality with the driver API gateway.

## Features

- JWT token authentication
- WebSocket connection management
- Driver status toggling (Available/Busy)
- Automatic location updates every 10 seconds when driver is available
- Event logging

## How to Run

1. Start the simple HTTP server:

```bash
cd frontend
node server.js
```

2. Open your browser and navigate to [http://localhost:8080](http://localhost:8080)

3. Enter a valid JWT token for a driver user

4. Click "Connect" to establish WebSocket connection

5. Once connected, you can:
   - Toggle driver status between "Available" and "Busy"
   - When "Available", the application will automatically send location updates every 10 seconds
   - View the event log to see all WebSocket communications

## Technical Details

- The application will automatically request location permissions from your browser
- When driver status is set to "Available", location updates are sent every 10 seconds
- Location data includes latitude, longitude, and other geolocation information
- The connection status and availability status are displayed prominently

## Application Structure

- `index.html` - Main HTML interface
- `app.js` - JavaScript logic for WebSocket communication and UI updates
- `server.js` - Simple HTTP server to serve the frontend files

## Integration with Backend

This frontend connects to the WebSocket gateway at `https://1drive-dev.wegobitest.com` and uses the following events:

- `updateDriverAvailability` - To toggle driver status between available and busy
- `updateDriverLocation` - To send driver location updates with coordinates
