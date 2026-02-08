import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './app';
import * as socketUtil from './utils/socket';

const server = http.createServer(app);

// Initialize Socket.io
socketUtil.init(server);

const PORT: string | number = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
