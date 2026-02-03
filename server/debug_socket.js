const io = require('socket.io-client');
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('Connected to server');

    // Simulate Technician emitting location
    const payload = {
        jobId: 10, // Integer
        lat: 24.8,
        lng: -107.4
    };
    console.log('Emitting:', payload);
    socket.emit('technician_location_update', payload);
});

// Listen for broadcast
socket.on('technician_location_update', (data) => {
    console.log('Received broadcast:', data);
    console.log('jobId type:', typeof data.jobId);
    socket.disconnect();
});
