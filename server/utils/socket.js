const { Server } = require("socket.io");

let io;

module.exports = {
    init: (httpServer) => {
        io = new Server(httpServer, {
            cors: {
                origin: "*", // Allow all origins for mobile/production flexibility
                methods: ["GET", "POST", "PUT"]
            }
        });

        io.on('connection', (socket) => {
            console.log('A user connected:', socket.id);

            // Relay technician location
            socket.on('technician_location_update', (data) => {
                // data: { jobId, lat, lng }
                // Broadcast to all (for now) or room
                io.emit('technician_location_update', data);
            });

            socket.on('disconnect', () => {
                console.log('User disconnected:', socket.id);
            });
        });

        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    }
};
