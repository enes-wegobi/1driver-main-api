# WebSocket Connection Guide

This guide explains how to connect from a local environment to the WebSocket server running at "1drive-dev.wegobitest.com".

## Changes Made to Fix CORS Issues

We've made several changes to both the server and client configurations to fix the CORS issues:

### 1. Server Changes (main.ts)

- Updated WebSocket CORS configuration to explicitly list allowed origins
- Updated HTTP CORS configuration to match WebSocket settings
- Added necessary headers to CORS configuration
- Updated Content Security Policy to allow connections to remote WebSocket server

### 2. WebSocket Gateway Changes (websocket.gateway.ts)

- Updated CORS configuration to match main.ts
- Changed credentials setting from `false` to `true`
- Added allowed headers

### 3. Client Changes (frontend/app.js)

- Updated Socket.IO client configuration to use `withCredentials: true` 

## Connecting from Local to Remote Server

Follow these steps to connect from your local machine to the remote WebSocket server:

1. Run the local frontend server:
   ```
   cd frontend
   node server.js
   ```

2. Open the frontend in your browser: http://localhost:8080

3. In the WebSocket Test Client:
   - Server URL: "1drive-dev.wegobitest.com"
   - Protocol: "https://" (or "wss://" if issues persist)
   - Transport Mode: "WebSocket with Polling fallback"
   - JWT Token: (Enter your valid JWT token)
   - Click "Connect"

4. Check the "Event Log" and "Connection Debug" sections for connection status and any errors.

## Troubleshooting

If you still encounter connection issues:

1. **Try Different Transport Modes**:
   - Try "HTTP Polling only" if WebSocket connections are blocked
   - Try "WebSocket only" if you want to ensure WebSocket protocol is used

2. **Check Browser Console**:
   - Open browser dev tools (F12) and check the Console tab for detailed errors

3. **Verify Token**:
   - Ensure your JWT token is valid and not expired

4. **Server Restart**:
   - The server may need to be restarted for CORS changes to take effect

## Understanding CORS and WebSocket

CORS (Cross-Origin Resource Sharing) is a security feature implemented by browsers that restricts web pages from making requests to a different domain than the one that served the web page.

For WebSocket connections:
- When using secure WebSockets (wss://), the page must be served over HTTPS
- When using credentials, the server must specify an exact origin, not a wildcard (*)
- The server must respond with appropriate CORS headers during the WebSocket handshake

The changes we've made ensure these requirements are met for both the WebSocket connection and any HTTP requests.
