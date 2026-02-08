import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export const init = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for mobile/production flexibility
            methods: ["GET", "POST", "PUT"]
        }
    });

    io.on('connection', (socket: Socket) => {
        console.log('A user connected:', socket.id);

        // Relay technician location
        socket.on('technician_location_update', (data: any) => {
            // data: { jobId, lat, lng }
            // Broadcast to all (for now) or room
            io.emit('technician_location_update', data);
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
