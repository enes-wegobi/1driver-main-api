// DOM Elements
const tokenInput = document.getElementById('token');
const connectBtn = document.getElementById('connect-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const availableBtn = document.getElementById('available-btn');
const busyBtn = document.getElementById('busy-btn');
const connectionStatus = document.getElementById('connection-status');
const availabilityStatus = document.getElementById('availability-status');
const currentLocation = document.getElementById('current-location');
const lastUpdate = document.getElementById('last-update');
const eventLog = document.getElementById('event-log');

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
function logEvent(event, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('p');
    logEntry.innerHTML = `<strong>[${timestamp}]</strong> ${event}`;
    
    if (data) {
        logEntry.innerHTML += `: <span style="color: #0066cc">${JSON.stringify(data)}</span>`;
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
    
    if (!token) {
        alert('Please enter a JWT token');
        return;
    }
    
    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
    }
    
    logEvent('Connecting to WebSocket server...');
    
    // Create socket connection with token authentication
    // Connect to the backend WebSocket server (default port is 3000)
    socket = io('http://localhost:3000', {
        transports: ['websocket'],
        auth: { token }
    });
    
    // Socket event handlers
    socket.on('connect', () => {
        logEvent('Socket connected');
        updateUIConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        logEvent('Socket disconnected');
        updateUIConnectionStatus(false);
        stopLocationUpdates();
    });
    
    socket.on('error', (error) => {
        logEvent('Socket error', error);
        alert(`Connection error: ${error.message || 'Unknown error'}`);
        socket.disconnect();
    });
    
    socket.on('connect_error', (error) => {
        logEvent('Connection error', { message: error.message });
        alert(`Failed to connect: ${error.message}. Make sure the backend server is running on port 3000.`);
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

// Initialize UI
updateUIConnectionStatus(false);
updateUIAvailabilityStatus();
logEvent('Application initialized');
