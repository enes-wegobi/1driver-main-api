// DOM Elements
const tokenInput = document.getElementById('token');
const serverUrlInput = document.getElementById('server-url');
const protocolSelect = document.getElementById('protocol-select');
const transportSelect = document.getElementById('transport-select');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const availableBtn = document.getElementById('available-btn');
const busyBtn = document.getElementById('busy-btn');
const connectionStatus = document.getElementById('connection-status');
const availabilityStatus = document.getElementById('availability-status');
const currentLocation = document.getElementById('current-location');
const lastUpdate = document.getElementById('last-update');
const eventLog = document.getElementById('event-log');
const debugInfo = document.getElementById('debug-info');
const clearLogBtn = document.getElementById('clear-log-btn');

// WebSocket connection
let socket = null;
let locationInterval = null;

// Driver status
const DriverAvailabilityStatus = {
    AVAILABLE: 'available',
    BUSY: 'busy',
    OFFLINE: 'offline'
};

// Current status
let currentAvailabilityStatus = DriverAvailabilityStatus.OFFLINE;

// Log an event
function logEvent(event, data = null, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('p');
    
    if (isError) {
        logEntry.style.color = '#f44336';
        logEntry.style.fontWeight = 'bold';
    }
    
    logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${event}`;
    
    if (data) {
        const jsonData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        logEntry.innerHTML += `: <span style="color: ${isError ? '#f44336' : '#0066cc'}">${jsonData}</span>`;
        
        // Also update debug info for errors
        if (isError && debugInfo) {
            debugInfo.innerHTML = `
                <h3>Connection Debug Information</h3>
                <p><strong>Error Type:</strong> ${event}</p>
                <p><strong>Message:</strong> ${typeof data === 'object' ? data.message || 'Unknown error' : data}</p>
                <p><strong>Server URL:</strong> ${serverUrlInput?.value || 'https://1drive-dev.wegobitest.com'}</p>
                <p><strong>Timestamp:</strong> ${timestamp}</p>
                <p><strong>Full Error Details:</strong> <pre>${jsonData}</pre></p>
                <p><strong>Troubleshooting Tips:</strong></p>
                <ul>
                    <li>Check if the server URL is correct</li>
                    <li>Verify that the server is running and accessible</li>
                    <li>Check for CORS issues (try with/without https)</li>
                    <li>Verify your token is valid</li>
                    <li>Check browser console for additional errors (F12)</li>
                </ul>
            `;
        }
    }
    
    eventLog.appendChild(logEntry);
    eventLog.scrollTop = eventLog.scrollHeight;
}

// Update UI based on connection status
function updateUIConnectionStatus(isConnected) {
    if (isConnected) {
        connectionStatus.textContent = 'Connected';
        connectionStatus.style.color = '#4CAF50';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        availableBtn.disabled = false;
        busyBtn.disabled = false;
        tokenInput.disabled = true;
    } else {
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.style.color = '#f44336';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        availableBtn.disabled = true;
        busyBtn.disabled = true;
        tokenInput.disabled = false;
        
        // Reset status
        currentAvailabilityStatus = DriverAvailabilityStatus.OFFLINE;
        updateUIAvailabilityStatus();
    }
}

// Update UI based on availability status
function updateUIAvailabilityStatus() {
    availabilityStatus.textContent = currentAvailabilityStatus.toUpperCase();
    
    // Remove all status classes
    availabilityStatus.classList.remove('available', 'busy', 'offline');
    
    // Add appropriate class
    switch (currentAvailabilityStatus) {
        case DriverAvailabilityStatus.AVAILABLE:
            availabilityStatus.classList.add('available');
            break;
        case DriverAvailabilityStatus.BUSY:
            availabilityStatus.classList.add('busy');
            break;
        case DriverAvailabilityStatus.OFFLINE:
            availabilityStatus.classList.add('offline');
            break;
    }
}

// Get current position
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    altitude: position.coords.altitude,
                    timestamp: new Date().toISOString()
                });
            },
            error => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    });
}

// Send location update
async function sendLocationUpdate() {
    try {
        const position = await getCurrentPosition();
        
        // Update UI
        currentLocation.textContent = `Lat: ${position.latitude.toFixed(6)}, Lng: ${position.longitude.toFixed(6)}`;
        lastUpdate.textContent = new Date().toLocaleTimeString();
        
        // Add availability status to location data
        const locationData = {
            ...position,
            availabilityStatus: currentAvailabilityStatus
        };
        
        // Send to server
        if (socket && socket.connected) {
            socket.emit('updateDriverLocation', locationData);
            logEvent('Location update sent', locationData);
        }
    } catch (error) {
        logEvent('Error getting location', { message: error.message });
    }
}

// Start location updates
function startLocationUpdates() {
    // Clear any existing interval
    if (locationInterval) {
        clearInterval(locationInterval);
    }
    
    // Initial update
    sendLocationUpdate();
    
    // Set interval to update every 10 seconds
    locationInterval = setInterval(sendLocationUpdate, 10000);
    logEvent('Started location updates (every 10 seconds)');
}

// Stop location updates
function stopLocationUpdates() {
    if (locationInterval) {
        clearInterval(locationInterval);
        locationInterval = null;
        logEvent('Stopped location updates');
    }
}

// Connect to WebSocket
function connectWebSocket() {
    const token = tokenInput.value.trim();
    const serverUrl = serverUrlInput.value.trim();
    
    if (!token) {
        alert('Please enter a JWT token');
        return;
    }
    
    if (!serverUrl) {
        alert('Please enter a server URL');
        return;
    }
    
    // Clear debug info
    if (debugInfo) {
        debugInfo.innerHTML = '';
    }
    
    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
    }
    
    logEvent('Connecting to WebSocket server...', { url: serverUrl });
    
    // Create socket connection with token authentication
    try {
        // Handle different transports based on selection
        const transports = transportSelect.value === 'both' 
            ? ['websocket', 'polling'] 
            : [transportSelect.value];
        
        // Create full server URL with selected protocol if not already specified
        let fullServerUrl = serverUrl;
        if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://') && 
            !serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
            fullServerUrl = `${protocolSelect.value}://${serverUrl}`;
        }
        
        logEvent('Connecting with configuration', {
            url: fullServerUrl,
            transports: transports,
            protocol: protocolSelect.value
        });
        
        socket = io(fullServerUrl, {
            transports: transports,
            auth: { token },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000,
            withCredentials: true,  // Changed to true to match server's expectation
            extraHeaders: {
                'Authorization': `Bearer ${token}`
            }
        });
    } catch (error) {
        logEvent('Socket initialization error', { message: error.message, stack: error.stack }, true);
        return;
    }
    
    // Socket event handlers
    socket.on('connect', () => {
        logEvent('Socket connected');
        updateUIConnectionStatus(true);
    });
    
    socket.on('disconnect', (reason) => {
        logEvent('Socket disconnected', { reason }, reason !== 'io client disconnect');
        updateUIConnectionStatus(false);
        stopLocationUpdates();
    });
    
    socket.on('error', (error) => {
        logEvent('Socket error', error, true);
        if (typeof error === 'object') {
            console.error('WebSocket error:', error);
        } else {
            console.error('WebSocket error:', error);
        }
        socket.disconnect();
    });
    
    socket.on('connect_error', (error) => {
        const errorDetails = {
            message: error.message,
            type: error.type,
            description: error.description,
            stack: error.stack,
            server: serverUrl
        };
        
        logEvent('Connection error', errorDetails, true);
        console.error('WebSocket connection error:', error);
        
        // Try to add more detailed troubleshooting information
        let troubleshootingInfo = '';
        
        if (error.message && error.message.includes('websocket error')) {
            troubleshootingInfo = `
                <h4>WebSocket Connection Failed</h4>
                <p>The WebSocket connection couldn't be established. This could be due to:</p>
                <ul>
                    <li>The server doesn't support WebSockets</li>
                    <li>There's a network firewall blocking WebSocket connections</li>
                    <li>SSL certificate issues when using wss:// (try switching to http:// for testing)</li>
                    <li>CORS policy restrictions on the server</li>
                </ul>
                <p><strong>Suggestions:</strong></p>
                <ol>
                    <li>Try switching between WebSocket and Polling transport modes</li>
                    <li>Try using HTTP instead of HTTPS (or vice versa)</li>
                    <li>Try connecting to a local development server (http://localhost:3000)</li>
                    <li>Check if the server has CORS configured correctly</li>
                </ol>
            `;
            
            if (debugInfo) {
                debugInfo.innerHTML += troubleshootingInfo;
            }
        }
    });
    
    socket.on('connection', (data) => {
        logEvent('Connection handshake successful', data);
        
        // If server provides current availability status, use it
        if (data.availabilityStatus) {
            currentAvailabilityStatus = data.availabilityStatus;
            updateUIAvailabilityStatus();
        }
    });
}

// Disconnect from WebSocket
function disconnectWebSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        logEvent('Manually disconnected from server');
    }
}

// Update driver availability
function updateDriverAvailability(status) {
    if (!socket || !socket.connected) {
        alert('Not connected to server');
        return;
    }
    
    // Send status update to server
    socket.emit('updateDriverAvailability', { status }, (response) => {
        if (response && response.success) {
            currentAvailabilityStatus = status;
            updateUIAvailabilityStatus();
            logEvent(`Driver status updated to ${status}`);
            
            // If available, start sending location updates
            if (status === DriverAvailabilityStatus.AVAILABLE) {
                startLocationUpdates();
            } else {
                stopLocationUpdates();
            }
        } else {
            logEvent('Failed to update status', response);
            alert(`Failed to update status: ${response?.message || 'Unknown error'}`);
        }
    });
}

// Event Listeners
connectBtn.addEventListener('click', connectWebSocket);
disconnectBtn.addEventListener('click', disconnectWebSocket);

availableBtn.addEventListener('click', () => {
    updateDriverAvailability(DriverAvailabilityStatus.AVAILABLE);
});

busyBtn.addEventListener('click', () => {
    updateDriverAvailability(DriverAvailabilityStatus.BUSY);
});

// Clear log button
if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
        eventLog.innerHTML = '';
        logEvent('Event log cleared');
    });
}

// Preset server configurations
if (document.getElementById('preset-local')) {
    document.getElementById('preset-local').addEventListener('click', () => {
        serverUrlInput.value = 'localhost:3000';
        protocolSelect.value = 'http';
        transportSelect.value = 'polling';
    });
}

if (document.getElementById('preset-dev')) {
    document.getElementById('preset-dev').addEventListener('click', () => {
        serverUrlInput.value = '1drive-dev.wegobitest.com';
        protocolSelect.value = 'https';
        transportSelect.value = 'both';
    });
}

// Initialize UI
updateUIConnectionStatus(false);
updateUIAvailabilityStatus();
logEvent('Application initialized');
